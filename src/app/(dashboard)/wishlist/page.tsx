export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getWishlistData } from "@/app/_actions/wishlist";
import { WishlistClient } from "@/components/wishlist/WishlistClient";

export default async function WishlistPage() {
    const data = await getWishlistData();
    if (!data.success || !data.items || !data.goals || !data.metrics) {
        redirect("/login");
    }

    return (
        <WishlistClient 
            items={data.items}
            goals={data.goals}
            metrics={data.metrics}
        />
    );
}
