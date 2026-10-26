import type { GarmentPlaceholder } from "@/lib/design-constants";
import { deleteDesignProduct, updateDesignProduct, type DesignProductInput } from "@/lib/design-products";
import { handle, readJson } from "@/lib/portal/http";

type Params = { params: Promise<{ id: string }> };

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

export async function PATCH(request: Request, { params }: Params) {
  const id = Number((await params).id);
  return handle(request, { staff: true }, async () => {
    const body = await readJson(request);
    await updateDesignProduct(id, readInput(body));
    return {};
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const id = Number((await params).id);
  return handle(request, { staff: true }, async () => {
    await deleteDesignProduct(id);
    return {};
  });
}
