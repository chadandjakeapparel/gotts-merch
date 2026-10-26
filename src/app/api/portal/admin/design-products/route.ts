import type { GarmentPlaceholder } from "@/lib/design-constants";
import { createDesignProduct, listAllDesignProducts, type DesignProductInput } from "@/lib/design-products";
import { handle, readJson } from "@/lib/portal/http";

function readInput(body: Record<string, unknown>): DesignProductInput {
  const area = (body.printArea && typeof body.printArea === "object" ? body.printArea : {}) as Record<string, unknown>;
  return {
    label: typeof body.label === "string" ? body.label.trim().slice(0, 120) : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim().slice(0, 500) : "",
    placeholder:
      body.placeholder === "black-tee" || body.placeholder === "white-hoodie" || body.placeholder === "grey-crewneck"
        ? (body.placeholder as GarmentPlaceholder)
        : null,
    printArea: {
      left: Number(area.left) || 0,
      top: Number(area.top) || 0,
      width: Number(area.width) || 0,
      height: Number(area.height) || 0,
    },
    active: Boolean(body.active),
  };
}

export async function GET(request: Request) {
  return handle(request, { staff: true }, async () => ({ products: await listAllDesignProducts() }));
}

export async function POST(request: Request) {
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    return { id: await createDesignProduct(readInput(body)) };
  });
}
