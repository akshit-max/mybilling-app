import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getOfflineProducts, deleteOfflineProduct, OfflineProduct } from "./offlineProducts";

let isSyncInProgress = false;

const syncOneProduct = async (product: OfflineProduct) => {
  const { id, isOffline, isEdit, originalProductId, ...firestoreProduct } = product;

  if (product.isEdit && product.originalProductId) {
    // It's an edit of an existing product
    await updateDoc(doc(db, "products", product.originalProductId), firestoreProduct);
  } else {
    // It's a new product creation
    await addDoc(collection(db, "products"), firestoreProduct);
  }
};

export const syncOfflineProducts = async () => {
  if (isSyncInProgress) return;
  isSyncInProgress = true;

  try {
    const products = await getOfflineProducts();

    if (!products.length) return;

    for (const product of products) {
      try {
        await syncOneProduct(product);
        if (product.id) {
          await deleteOfflineProduct(product.id);
        }
      } catch (err) {
        console.error("Failed to sync offline product:", product, err);
      }
    }

    console.log("Offline product sync attempt finished");
  } catch (err) {
    console.error("Error during offline product sync:", err);
  } finally {
    isSyncInProgress = false;
  }
};
