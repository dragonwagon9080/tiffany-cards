export type CardsAlertLists = {
  sports: string[];
  reasons: string[];
};

function uniqueValues(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export async function getCardsAlertLists(): Promise<CardsAlertLists> {
  const apiUrl =
    process.env.CARDS_ALERT_API_URL;

  if (!apiUrl) {
    console.error(
      "Missing CARDS_ALERT_API_URL environment variable."
    );

    return {
      sports: [],
      reasons: [],
    };
  }

  try {
    const url = new URL(apiUrl);

    url.searchParams.set(
      "action",
      "lists"
    );

    const response = await fetch(
      url.toString(),
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Cards Alert lists fetch failed:",
        response.status
      );

      return {
        sports: [],
        reasons: [],
      };
    }

    const result = await response.json();

    if (result?.success === false) {
      console.error(
        "Cards Alert lists error:",
        result?.error
      );

      return {
        sports: [],
        reasons: [],
      };
    }

    return {
      sports: uniqueValues(
        result?.sports
      ),
      reasons: uniqueValues(
        result?.reasons
      ),
    };
  } catch (error) {
    console.error(
      "Cards Alert lists fetch error:",
      error
    );

    return {
      sports: [],
      reasons: [],
    };
  }
}