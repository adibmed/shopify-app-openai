import {
  Badge,
  Card,
  ChoiceList,
  EmptySearchResult,
  Frame,
  IndexFilters,
  IndexTable,
  Page,
  Toast,
  useIndexResourceState,
  useSetIndexFiltersMode,
} from "@shopify/polaris";
import { useCallback, useState, useEffect } from "react";
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import ProductUpdate from "../components/ProductUpdate";
import { useProducts } from "../services/product";

const Products = () => {
  const emptyToastProps = { content: null };
  const [toastProps, setToastProps] = useState(emptyToastProps);
  const fetch = useAuthenticatedFetch();

  const { data, isLoading } = useProducts();

  const [showModal, setShowModal] = useState(false);
  const [itemStrings, setItemStrings] = useState([
    "All",
    "Active",
    "Draft",
    "Archived",
  ]);
  const [selected, setSelected] = useState(0);
  const [sortSelected, setSortSelected] = useState(["product asc"]);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [tone, setStatus] = useState(undefined);
  const [type, setType] = useState(undefined);
  const [queryValue, setQueryValue] = useState("");

  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (data?.data) {
      const transformedProducts = data.data.map((product) => ({
        id: product.id,
        price: `$${product.variants[0].price}`,
        product: product.title,
        tone: (
          <Badge tone={product.status === "active" ? "success" : "info"}>
            {product.status}
          </Badge>
        ),
        inventory: `${product.variants[0].inventory_quantity} in stock`,
        type: product.product_type,
        description: product.body_html,
        image: product.image?.src,
      }));
      setProducts(transformedProducts);
    }
  }, [data]);

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(products);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const disambiguateLabel = (key, value) => {
    switch (key) {
      case "type":
        return value.map((val) => `type: ${val}`).join(", ");
      case "tone":
        return value.map((val) => `tone: ${val}`).join(", ");
      default:
        return value;
    }
  };

  const isEmpty = (value) => {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === "" || value == null;
    }
  };

  const deleteView = (index) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };

  const duplicateView = async (name) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };

  const onCreateNewView = async (value) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSelected(itemStrings.length);
    return true;
  };

  const handleStatusChange = useCallback((value) => setStatus(value), []);
  const handleTypeChange = useCallback((value) => setType(value), []);
  const handleFiltersQueryChange = useCallback(
    (value) => setQueryValue(value),
    []
  );
  const handleStatusRemove = useCallback(() => setStatus(undefined), []);
  const handleTypeRemove = useCallback(() => setType(undefined), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(""), []);
  const handleFiltersClearAll = useCallback(() => {
    handleStatusRemove();
    handleTypeRemove();
    handleQueryValueRemove();
  }, [handleStatusRemove, handleQueryValueRemove, handleTypeRemove]);

  const appliedFilters = [];
  if (tone && !isEmpty(tone)) {
    const key = "tone";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, tone),
      onRemove: handleStatusRemove,
    });
  }
  if (type && !isEmpty(type)) {
    const key = "type";
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, type),
      onRemove: handleTypeRemove,
    });
  }

  const rowMarkup = products.map(
    (
      { id, product, price, tone, inventory, type, description, image },
      index
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        selectionRange={{ startIndex: 0, endIndex: 2 }}
      >
        <IndexTable.Cell>
          {image ? (
            <img
              src={image}
              alt={"product thumbnail" + product}
              width={40}
              height={40}
            />
          ) : (
            <div>no image</div>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>{product}</IndexTable.Cell>
        <IndexTable.Cell>{price}</IndexTable.Cell>
        <IndexTable.Cell>{tone}</IndexTable.Cell>
        <IndexTable.Cell>{inventory}</IndexTable.Cell>
        <IndexTable.Cell>{type}</IndexTable.Cell>
        <IndexTable.Cell>{description}</IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  const emptyStateMarkup = (
    <EmptySearchResult
      title={"No products yet"}
      description={"Try changing the filters or search term"}
      withIllustration
    />
  );

  const primaryAction =
    selected === 0
      ? {
          type: "save-as",
          onAction: onCreateNewView,
          disabled: false,
          loading: false,
        }
      : {
          type: "save",
          onAction: async () => {
            await sleep(1);
            return true;
          },
          disabled: false,
          loading: false,
        };

  const [show, setShow] = useState(true);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [active, setActive] = useState(false);

  const toggleActive = useCallback(() => setActive((active) => !active), []);

  const toastMarkup = active ? (
    <Toast content="Select only 1 product" onDismiss={toggleActive} />
  ) : null;

  const generate = () => {
    if (selectedResources.length !== 1) {
      toggleActive();
      return;
    }
    setIsGenerating(true);
    const response = fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedResources }),
    });
    response
      .then((response) => response.json())
      .then((data) => {
        setDescription(data.description);
        setShow(true);
        setIsGenerating(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setIsGenerating(false);
      });

    return true;
  };

  return (
    <Frame>
      {toastMarkup}
      <ProductUpdate
        active={show}
        setActive={setShow}
        description={description}
        productId={selectedResources[0] || 9581094469949}
      />
      <Page
        title={"Products"}
        primaryAction={{
          content: "Generate",
          onAction: generate,
          loading: isGenerating,
        }}
        fullWidth
      >
        <Card padding="0">
          <IndexFilters
            sortOptions={[
              {
                label: "Product",
                value: "product asc",
                directionLabel: "Ascending",
              },
              {
                label: "Product",
                value: "product desc",
                directionLabel: "Descending",
              },
              { label: "Status", value: "tone asc", directionLabel: "A-Z" },
              { label: "Status", value: "tone desc", directionLabel: "Z-A" },
              { label: "Type", value: "type asc", directionLabel: "A-Z" },
              { label: "Type", value: "type desc", directionLabel: "Z-A" },
              {
                label: "Description",
                value: "description asc",
                directionLabel: "Ascending",
              },
              {
                label: "Description",
                value: "description desc",
                directionLabel: "Descending",
              },
            ]}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder="Searching in all"
            onQueryChange={handleFiltersQueryChange}
            onQueryClear={() => {}}
            onSort={setSortSelected}
            primaryAction={primaryAction}
            cancelAction={{
              onAction: () => {},
              disabled: false,
              loading: false,
            }}
            tabs={itemStrings.map((item, index) => ({
              content: item,
              index,
              onAction: () => {},
              id: `${item}-${index}`,
              isLocked: index === 0,
              actions:
                index === 0
                  ? []
                  : [
                      {
                        type: "rename",
                        onAction: () => {},
                        onPrimaryAction: async (value) => {
                          const newItemsStrings = itemStrings.map(
                            (item, idx) => {
                              if (idx === index) {
                                return value;
                              }
                              return item;
                            }
                          );
                          await sleep(1);
                          setItemStrings(newItemsStrings);
                          return true;
                        },
                      },
                      {
                        type: "duplicate",
                        onPrimaryAction: async (name) => {
                          await sleep(1);
                          duplicateView(name);
                          return true;
                        },
                      },
                      {
                        type: "delete",
                        onPrimaryAction: async () => {
                          await sleep(1);
                          deleteView(index);
                          return true;
                        },
                      },
                    ],
            }))}
            selected={selected}
            onSelect={setSelected}
            canCreateNewView
            onCreateNewView={onCreateNewView}
            mode={mode}
            setMode={setMode}
            filters={[]}
            appliedFilters={appliedFilters}
            onClearAll={handleFiltersClearAll}
          />
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            emptyState={emptyStateMarkup}
            headings={[
              { title: "Thumbnail", hidden: true },
              { title: "Product" },
              { title: "Price" },
              { title: "Status" },
              { title: "Inventory" },
              { title: "Type" },
              { title: "Description" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </Page>
    </Frame>
  );
};

export default Products;
