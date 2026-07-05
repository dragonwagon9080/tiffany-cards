import type { Metadata } from "next";
import GroupClient from "@/components/rpa-tracker/GroupClient";

type GroupResponse = {
  group: {
    Card_Title_Display?: string;
    Card_Title?: string;
    Description?: string;
    Main_Page_Image?: string;
  };
};

const API =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "";

async function getGroup(slug: string): Promise<GroupResponse | null> {
  try {
    if (!API) return null;

    const res = await fetch(
      `${API}/api/rpa-tracker?mode=group&slug=${slug}`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const data = await getGroup(slug);

  if (!data) {
    return {
      title: "Registry Not Found",
    };
  }

  const group = data.group;

  const title =
    group.Card_Title_Display ||
    group.Card_Title ||
    "RPA Registry";

  return {
    title,
    description: group.Description,
    openGraph: {
      title,
      description: group.Description,
      images: group.Main_Page_Image
        ? [
            {
              url: group.Main_Page_Image,
            },
          ]
        : [],
    },
  };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <GroupClient slug={slug} />;
}