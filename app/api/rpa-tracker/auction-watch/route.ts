import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  buildStrictAuctionQuery,
  classifyStrictAuctionMatch,
  clean,
  getEbayToken,
  mapItem,
  searchEbay,
} from "@/lib/ebay";

import type {
  SearchContext,
} from "@/lib/ebay";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const MAX_CARDS_PER_REQUEST = 40;
const SEARCH_RESULTS_PER_CARD = 20;
const MAX_MATCHES_PER_CARD = 12;
const SEARCH_CONCURRENCY = 10;

type AuctionWatchCardInput = {
  cardId?: unknown;
  slug?: unknown;
  title?: unknown;
  cardTitle?: unknown;
  year?: unknown;
  player?: unknown;
  first?: unknown;
  last?: unknown;
  cardNumber?: unknown;
  num?: unknown;
  brand?: unknown;
};

type AuctionWatchRequestBody = {
  secret?: unknown;
  cards?: unknown;
};

type NormalizedWatchCard = {
  context: SearchContext;
  registryUrl: string;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

function jsonError(
  error: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details !== undefined
        ? {
            details,
          }
        : {}),
    },
    {
      status,
      headers:
        noStoreHeaders(),
    }
  );
}

function getProvidedSecret(
  req: NextRequest,
  body: AuctionWatchRequestBody
) {
  const authorization =
    clean(
      req.headers.get(
        "authorization"
      )
    );

  const bearerSecret =
    authorization
      .toLowerCase()
      .startsWith("bearer ")
      ? clean(
          authorization.slice(7)
        )
      : "";

  return (
    bearerSecret ||
    clean(
      req.headers.get(
        "x-rpa-auction-watch-secret"
      )
    ) ||
    clean(
      body.secret
    )
  );
}

function secretsMatch(
  providedSecret: string,
  expectedSecret: string
) {
  if (
    !providedSecret ||
    !expectedSecret
  ) {
    return false;
  }

  if (
    providedSecret.length !==
    expectedSecret.length
  ) {
    return false;
  }

  let difference = 0;

  for (
    let index = 0;
    index <
    providedSecret.length;
    index += 1
  ) {
    difference |=
      providedSecret.charCodeAt(
        index
      ) ^
      expectedSecret.charCodeAt(
        index
      );
  }

  return difference === 0;
}

function buildPlayerName(
  card: AuctionWatchCardInput
) {
  const suppliedPlayer =
    clean(card.player);

  if (suppliedPlayer) {
    return suppliedPlayer;
  }

  return clean(
    [
      clean(card.first),
      clean(card.last),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function normalizeCard(
  rawCard: unknown,
  index: number
): NormalizedWatchCard {
  if (
    !rawCard ||
    typeof rawCard !==
      "object" ||
    Array.isArray(rawCard)
  ) {
    throw new Error(
      `Card ${index + 1} is not a valid object.`
    );
  }

  const card =
    rawCard as
      AuctionWatchCardInput;

  const title =
    clean(
      card.title ||
        card.cardTitle
    );

  const year =
    clean(card.year);

  const player =
    buildPlayerName(card);

  const cardNumber =
    clean(
      card.cardNumber ||
        card.num
    );

  const brand =
    clean(card.brand);

  const cardId =
    clean(card.cardId);

  const slug =
    clean(card.slug);

  const missingFields:
    string[] = [];

  if (!year) {
    missingFields.push(
      "year"
    );
  }

  if (!player) {
    missingFields.push(
      "player"
    );
  }

  if (!cardNumber) {
    missingFields.push(
      "card number"
    );
  }

  if (!brand) {
    missingFields.push(
      "brand"
    );
  }

  if (!slug) {
    missingFields.push(
      "slug"
    );
  }

  if (missingFields.length) {
    throw new Error(
      `Card ${
        index + 1
      } is missing: ${missingFields.join(
        ", "
      )}.`
    );
  }

  const context:
    SearchContext = {
      title,
      year,
      player,
      cardNumber,
      brand,

      cardId:
        cardId ||
        slug,

      slug,
    };

  return {
    context,

    registryUrl:
      buildRegistryUrl(slug),
  };
}

function buildRegistryUrl(
  slug: string
) {
  const configuredBaseUrl =
    clean(
      process.env
        .NEXT_PUBLIC_SITE_URL
    ) ||
    clean(
      process.env
        .SITE_URL
    ) ||
    "https://www.tiffanycards.com";

  return `${configuredBaseUrl.replace(
    /\/+$/,
    ""
  )}/rpa-tracker/group/${encodeURIComponent(
    slug
  )}`;
}

function buildAffiliateReference(
  context: SearchContext
) {
  return (
    clean(
      context.cardId ||
        context.slug ||
        "rpa-auction-watch"
    )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        ""
      )
      .slice(0, 100) ||
    "rpa-auction-watch"
  );
}

function listingIdentityKey(
  item: {
    id: string;
    legacyItemId: string;
    url: string;
  }
) {
  return (
    clean(item.id) ||
    clean(
      item.legacyItemId
    ) ||
    clean(item.url)
  );
}

function isUsableListing(
  item: {
    title: string;
    image: string;
    url: string;
  }
) {
  return Boolean(
    clean(item.title) &&
      clean(item.image) &&
      clean(item.url)
  );
}

async function searchOneRegistry(
  token: string,
  card: NormalizedWatchCard
) {
  const {
    context,
    registryUrl,
  } = card;

  const query =
    buildStrictAuctionQuery(
      context
    );

  if (!query) {
    throw new Error(
      "Unable to build the eBay search query."
    );
  }

  const rawItems =
    await searchEbay(
      token,
      query,
      buildAffiliateReference(
        context
      ),
      {
        limit:
          SEARCH_RESULTS_PER_CARD,

        fieldgroups:
          "EXTENDED",
      }
    );

  const uniqueMatches =
    new Map<
      string,
      ReturnType<
        typeof mapItem
      >
    >();

  let rejectedCount = 0;
  let incompleteCount = 0;

  rawItems.forEach(
    (rawItem: any) => {
      const title =
        clean(
          rawItem?.title
        );

      const strictMatch =
        classifyStrictAuctionMatch(
          title,
          context
        );

      if (
        !strictMatch.accepted
      ) {
        rejectedCount += 1;
        return;
      }

      const listing =
        mapItem(
          rawItem,
          context
        );

      listing.registryUrl =
        registryUrl;

      listing.confidence =
        strictMatch.confidence;

      listing.reasons =
        strictMatch.reasons;

      if (
        !isUsableListing(
          listing
        )
      ) {
        incompleteCount += 1;
        return;
      }

      const identityKey =
        listingIdentityKey(
          listing
        );

      if (!identityKey) {
        incompleteCount += 1;
        return;
      }

      const existing =
        uniqueMatches.get(
          identityKey
        );

      if (
        !existing ||
        listing.confidence >
          existing.confidence ||
        (
          listing.confidence ===
            existing.confidence &&
          listing.score >
            existing.score
        )
      ) {
        uniqueMatches.set(
          identityKey,
          listing
        );
      }
    }
  );

  const items =
    Array.from(
      uniqueMatches.values()
    )
      .sort(
        (first, second) => {
          if (
            second.confidence !==
            first.confidence
          ) {
            return (
              second.confidence -
              first.confidence
            );
          }

          if (
            second.score !==
            first.score
          ) {
            return (
              second.score -
              first.score
            );
          }

          const firstEnd =
            Date.parse(
              first.endDate
            );

          const secondEnd =
            Date.parse(
              second.endDate
            );

          if (
            Number.isFinite(
              firstEnd
            ) &&
            Number.isFinite(
              secondEnd
            )
          ) {
            return (
              firstEnd -
              secondEnd
            );
          }

          return 0;
        }
      )
      .slice(
        0,
        MAX_MATCHES_PER_CARD
      );

  return {
    ok: true,

    cardId:
      context.cardId,

    slug:
      context.slug || "",

    year:
      context.year,

    player:
      context.player,

    cardNumber:
      context.cardNumber,

    brand:
      context.brand,

    query,

    registryUrl,

    searchedCount:
      rawItems.length,

    rejectedCount,

    incompleteCount,

    matchCount:
      items.length,

    items,
  };
}

async function mapWithConcurrency<
  Input,
  Output
>(
  values: Input[],
  concurrency: number,
  mapper: (
    value: Input,
    index: number
  ) => Promise<Output>
) {
  const output =
    new Array<Output>(
      values.length
    );

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex += 1;

      if (
        currentIndex >=
        values.length
      ) {
        return;
      }

      output[currentIndex] =
        await mapper(
          values[currentIndex],
          currentIndex
        );
    }
  }

  const workerCount =
    Math.min(
      Math.max(
        1,
        concurrency
      ),
      values.length
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },
      () => worker()
    )
  );

  return output;
}

export async function POST(
  req: NextRequest
) {
  const startedAt =
    Date.now();

  try {
    const expectedSecret =
      clean(
        process.env
          .RPA_AUCTION_WATCH_SECRET
      );

    if (!expectedSecret) {
      console.error(
        "RPA auction watch secret is not configured."
      );

      return jsonError(
        "Auction-watch service is not configured.",
        500
      );
    }

    let body:
      AuctionWatchRequestBody;

    try {
      body =
        await req.json();
    } catch {
      return jsonError(
        "Request body must be valid JSON.",
        400
      );
    }

    const providedSecret =
      getProvidedSecret(
        req,
        body
      );

    if (
      !secretsMatch(
        providedSecret,
        expectedSecret
      )
    ) {
      return jsonError(
        "Unauthorized.",
        401
      );
    }

    if (
      !Array.isArray(
        body.cards
      )
    ) {
      return jsonError(
        'Request body must include a "cards" array.',
        400
      );
    }

    if (
      body.cards.length === 0
    ) {
      return NextResponse.json(
        {
          ok: true,

          generatedAt:
            new Date()
              .toISOString(),

          requestedCount: 0,
          successfulCount: 0,
          failedCount: 0,
          totalMatches: 0,

          results: [],
          errors: [],
        },
        {
          headers:
            noStoreHeaders(),
        }
      );
    }

    if (
      body.cards.length >
      MAX_CARDS_PER_REQUEST
    ) {
      return jsonError(
        `A maximum of ${MAX_CARDS_PER_REQUEST} cards may be searched in one request.`,
        400
      );
    }

    const normalizedCards:
      NormalizedWatchCard[] =
        [];

    const validationErrors:
      Array<{
        index: number;
        error: string;
      }> = [];

    body.cards.forEach(
      (
        rawCard,
        index
      ) => {
        try {
          normalizedCards.push(
            normalizeCard(
              rawCard,
              index
            )
          );
        } catch (
          error: any
        ) {
          validationErrors.push(
            {
              index,

              error:
                error?.message ||
                "Invalid card.",
            }
          );
        }
      }
    );

    if (
      !normalizedCards.length
    ) {
      return jsonError(
        "No valid registry cards were supplied.",
        400,
        validationErrors
      );
    }

    const token =
      await getEbayToken();

    const searchResults =
      await mapWithConcurrency(
        normalizedCards,
        SEARCH_CONCURRENCY,

        async (
          card,
          index
        ) => {
          try {
            return {
              status:
                "fulfilled" as const,

              value:
                await searchOneRegistry(
                  token,
                  card
                ),
            };
          } catch (
            error: any
          ) {
            console.error(
              "RPA auction registry search failed:",
              {
                index,

                cardId:
                  card.context
                    .cardId,

                slug:
                  card.context
                    .slug,

                error:
                  error?.message ||
                  error,
              }
            );

            return {
              status:
                "rejected" as const,

              error: {
                index,

                cardId:
                  card.context
                    .cardId,

                slug:
                  card.context
                    .slug ||
                  "",

                error:
                  error?.message ||
                  "eBay search failed.",
              },
            };
          }
        }
      );

    const results =
      searchResults
        .filter(
          (
            result
          ): result is {
            status:
              "fulfilled";
            value:
              Awaited<
                ReturnType<
                  typeof searchOneRegistry
                >
              >;
          } =>
            result.status ===
            "fulfilled"
        )
        .map(
          (result) =>
            result.value
        );

    const searchErrors =
      searchResults
        .filter(
          (
            result
          ): result is {
            status:
              "rejected";
            error: {
              index: number;
              cardId: string;
              slug: string;
              error: string;
            };
          } =>
            result.status ===
            "rejected"
        )
        .map(
          (result) =>
            result.error
        );

    const errors = [
      ...validationErrors,
      ...searchErrors,
    ];

    const totalMatches =
      results.reduce(
        (
          total,
          result
        ) =>
          total +
          result.matchCount,
        0
      );

    return NextResponse.json(
      {
        ok: true,

        generatedAt:
          new Date()
            .toISOString(),

        durationMs:
          Date.now() -
          startedAt,

        requestedCount:
          body.cards.length,

        searchedCount:
          normalizedCards.length,

        successfulCount:
          results.length,

        failedCount:
          errors.length,

        totalMatches,

        results,
        errors,
      },
      {
        headers:
          noStoreHeaders(),
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "RPA auction-watch route error:",
      error
    );

    return jsonError(
      error?.message ||
        "Unable to complete the RPA auction search.",
      500
    );
  }
}