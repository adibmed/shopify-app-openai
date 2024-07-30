import { Modal, TextField } from "@shopify/polaris";
import { useCallback } from "react";
import { useProductUpdate } from "../services/product";

export default function ProductUpdate({
  active,
  setActive,
  description,
  productId,
}) {
  if (!active && !description && !productId) {
    return null;
  }
  const handleChange = useCallback(() => setActive(!active), [active]);

  const { update, isLoading } = useProductUpdate();
  const handleUpdate = async () => {
    await update({ description, productId });
    handleChange();
  };

  return (
    <Modal
      open={active}
      onClose={handleChange}
      title="Update product description"
      primaryAction={{
        content: "Update",
        onAction: handleUpdate,
        loading: isLoading,
        disabled: isLoading,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: handleChange,
        },
      ]}
    >
      <Modal.Section>
        <TextField
          label="Generated description ✨"
          value={description}
          onChange={handleChange}
          multiline={4}
          autoComplete="off"
        />
      </Modal.Section>
    </Modal>
  );
}
