import { fd } from "@/lib/display";
import { IMAGE_ATTACHMENT, type Attachment, type AttachmentKind, type OwnerType } from "@/lib/attachments";
import { removeAttachment, uploadAttachment } from "@/app/attachments/actions";
import AttachmentUploadForm from "@/components/AttachmentUploadForm";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";

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
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((r) => {
          const url = `/api/receipts/${r.file_path}`;
          const isImage = IMAGE_ATTACHMENT.test(r.file_path);
          return (
            <div key={r.id} className="border border-neutral-800 bg-neutral-900 p-2 text-xs">
              <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={r.original_name ?? KIND_LABEL[r.kind]} className="h-24 w-full object-cover" />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-neutral-950 text-neutral-500">
                    PDF
                  </div>
                )}
              </a>
              <div className="mt-1 truncate text-neutral-400" title={r.original_name ?? undefined}>
                {r.original_name}
              </div>
              <div className="flex items-center justify-between text-neutral-600">
                <span>{fd(r.uploaded_at)}</span>
                <form action={removeAttachment.bind(null, r.id)}>
                  <ConfirmSubmitButton
                    confirmMessage={`Delete ${KIND_LABEL[r.kind].toLowerCase()} "${r.original_name ?? "this file"}"?`}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="col-span-full text-sm text-neutral-500">{emptyText}</p>}
      </div>
      <AttachmentUploadForm action={uploadAttachment.bind(null, ownerType, ownerId, kind)} imagesOnly={imagesOnly} />
    </section>
  );
}
