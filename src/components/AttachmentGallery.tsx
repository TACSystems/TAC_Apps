import { fdt } from "@/lib/display";
import { IMAGE_ATTACHMENT, type Attachment, type AttachmentKind, type OwnerType } from "@/lib/attachments";
import { removeAttachment, uploadAttachment } from "@/app/attachments/actions";
import AttachmentUploadForm from "@/components/AttachmentUploadForm";
import AttachmentGrid from "@/components/AttachmentGrid";

const KIND_LABEL: Record<AttachmentKind, string> = {
  receipt: "Receipt",
  photo: "Photo",
  bill_of_sale: "Bill of Sale",
  document: "Document",
};

export default function AttachmentGallery({
  title,
  items,
  ownerType,
  ownerId,
  kind,
  emptyText,
  imagesOnly = false,
  id,
}: {
  title: string;
  items: Attachment[];
  ownerType: OwnerType;
  ownerId: string;
  kind: AttachmentKind;
  emptyText: string;
  imagesOnly?: boolean;
  id?: string;
}) {
  return (
    <section id={id}>
      <h2 className="mb-2 font-medium text-neutral-200">{title}</h2>
      <AttachmentGrid
        emptyText={emptyText}
        items={items.map((r) => ({
          id: r.id,
          url: `/api/receipts/${r.file_path}`,
          isImage: IMAGE_ATTACHMENT.test(r.file_path),
          name: r.original_name ?? KIND_LABEL[r.kind],
          date: fdt(r.uploaded_at),
          confirmMessage: `Delete ${KIND_LABEL[r.kind].toLowerCase()} "${r.original_name ?? "this file"}"?`,
          remove: removeAttachment.bind(null, r.id),
        }))}
      />
      <AttachmentUploadForm action={uploadAttachment.bind(null, ownerType, ownerId, kind)} imagesOnly={imagesOnly} />
    </section>
  );
}
