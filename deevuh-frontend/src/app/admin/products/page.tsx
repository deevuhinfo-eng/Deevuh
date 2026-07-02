"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Product } from "@/data/products";

const mapBackendProduct = (prod: any): Product => ({
  id: prod.id,
  title: prod.title,
  price: Number(prod.basePrice || prod.price || 0),
  category: prod.category,
  description: prod.description,
  images: prod.images ? prod.images.map((img: any) => typeof img === 'string' ? img : (img.imageUrl || "")) : [],
  sizes: prod.variants && prod.variants.length > 0 ? Array.from(new Set(prod.variants.map((v: any) => v.size))) as string[] : (prod.sizes || []),
  details: prod.details || ["Premium handcrafted fabric", "Made in India"],
});

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Coordset");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [productImages, setProductImages] = useState<{ id?: string; imageUrl: string; order: number }[]>([]);
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L"]);
  const [details, setDetails] = useState<string[]>([]);
  
  const [detailInput, setDetailInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [adminZoomImage, setAdminZoomImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [error, setError] = useState("");

  // Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null) return;
    const items = [...productImages];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    const updated = items.map((img, idx) => ({ ...img, order: idx }));
    setProductImages(updated);
    setDraggedIndex(null);
  };

  // Image helpers
  const handleRemoveProductImage = (index: number) => {
    const updated = productImages
      .filter((_, i) => i !== index)
      .map((img, idx) => ({ ...img, order: idx }));
    setProductImages(updated);
  };

  const handleSetCoverProductImage = (index: number) => {
    if (index === 0) return;
    const items = [...productImages];
    const target = items[index];
    items.splice(index, 1);
    items.unshift(target);
    const updated = items.map((img, idx) => ({ ...img, order: idx }));
    setProductImages(updated);
  };

  const openAdminZoom = (url: string) => {
    setAdminZoomImage(url);
  };

  const closeAdminZoom = () => {
    setAdminZoomImage(null);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingProductImage(true);
    try {
      const newImages = [...productImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('image', file);

        const res = await api.post('/uploads/image', formData);
        if (res?.status === 'success' && res.data?.url) {
          newImages.push({
            imageUrl: res.data.url,
            order: newImages.length
          });
        }
      }
      setProductImages(newImages);
    } catch (err: any) {
      alert(err.message || "Failed to upload image.");
    } finally {
      setUploadingProductImage(false);
      e.target.value = '';
    }
  };

  const handleReplaceProductImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProductImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/uploads/image', formData);
      if (res?.status === 'success' && res.data?.url) {
        const items = [...productImages];
        items[index] = {
          ...items[index],
          imageUrl: res.data.url,
        };
        setProductImages(items);
      }
    } catch (err: any) {
      alert(err.message || "Failed to replace image.");
    } finally {
      setUploadingProductImage(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    api.get("/products")
      .then((res: any) => {
        const productList = res.data || [];
        setRawProducts(productList);
        setProducts(productList.map(mapBackendProduct));
      })
      .catch((err) => {
        console.error("Backend products fetch failed", err);
        setError("Failed to load products list from database.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddDetail = () => {
    if (detailInput.trim()) {
      setDetails([...details, detailInput.trim()]);
      setDetailInput("");
    }
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setImages([...images, imageInput.trim()]);
      setImageInput("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter((s) => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPrice("");
    setCategory("Coordset");
    setDescription("");
    setImages([]);
    setProductImages([]);
    setSizes(["S", "M", "L"]);
    setDetails([]);
    setDetailInput("");
    setImageInput("");
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const basePriceNum = Number(price);

    try {
      if (editId) {
        // Backend PUT
        const updatePayload = {
          title,
          description,
          basePrice: basePriceNum,
          category,
          images: productImages,
        };
        await api.put(`/products/${editId}`, updatePayload)
          .then((res) => {
            const mapped = mapBackendProduct(res.data);
            setProducts(products.map(p => p.id === editId ? mapped : p));
            setRawProducts(rawProducts.map(p => p.id === editId ? res.data : p));
          })
          .catch((err) => {
            console.error("Backend update failed, updating locally.", err);
            // Simulated local edit
            const localPayload = {
              title,
              price: basePriceNum,
              category,
              description,
              images: productImages.map(img => img.imageUrl),
              sizes,
              details: details.length > 0 ? details : ["Premium handcrafted fabric", "Made in India"],
            };
            setProducts(products.map(p => p.id === editId ? { ...p, ...localPayload } : p));
          });
      } else {
        // Backend POST
        const createPayload = {
          title,
          description,
          basePrice: basePriceNum,
          category,
          variants: sizes.map(size => ({
            size,
            price: basePriceNum,
            stockQty: 100
          })),
          images: productImages.map((img, idx) => ({ imageUrl: img.imageUrl, order: idx }))
        };

        await api.post("/products", createPayload)
          .then((res) => {
            setProducts([mapBackendProduct(res.data), ...products]);
            setRawProducts([res.data, ...rawProducts]);
          })
          .catch((err) => {
            console.error("Backend create failed, creating locally.", err);
            // Simulated local create
            const newProd: Product = {
              id: title.toLowerCase().replace(/\s+/g, "-"),
              title,
              price: basePriceNum,
              category,
              description,
              images: productImages.map(img => img.imageUrl),
              sizes,
              details: details.length > 0 ? details : ["Premium handcrafted fabric", "Made in India"],
            };
            setProducts([newProd, ...products]);
          });
      }
      resetForm();
    } catch (err: any) {
      alert(err.message || "Failed to save product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (prod: Product) => {
    setTitle(prod.title);
    setPrice(String(prod.price));
    setCategory(prod.category);
    setDescription(prod.description);
    setSizes(prod.sizes);
    setDetails(prod.details);
    setEditId(prod.id);
    setShowForm(true);

    const rawProd = rawProducts.find(p => p.id === prod.id);
    if (rawProd && rawProd.images) {
      setProductImages(rawProd.images.map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        order: img.order || 0
      })));
    } else {
      setProductImages(prod.images.map((url, idx) => ({
        imageUrl: url,
        order: idx
      })));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to withdraw this capsule piece?")) return;
    try {
      await api.delete(`/products/${id}`)
        .then(() => {
          setProducts(products.filter((p) => p.id !== id));
          setRawProducts(rawProducts.filter((p) => p.id !== id));
        })
        .catch(() => {
          // Simulated local delete
          setProducts(products.filter((p) => p.id !== id));
          setRawProducts(rawProducts.filter((p) => p.id !== id));
        });
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 0", color: "var(--color-on-surface-variant)" }}>
        Loading capsule items...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "36px", fontWeight: 600, marginBottom: "8px" }}>Products</h1>
          <p style={{ color: "var(--color-on-surface-variant)", fontSize: "14px" }}>
            Maintain the capsule wardrobe registry, pricing points, and tailor outlines
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
        >
          {showForm ? "Cancel" : "+ Add Capsule Piece"}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: "var(--color-error-container)",
          border: "1px solid var(--color-error)",
          color: "var(--color-error)",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-elevated" style={{ marginBottom: "32px", padding: "24px" }}>
          <h3 style={{ marginBottom: "24px" }}>{editId ? "Edit Capsule Piece" : "Add New Capsule Piece"}</h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div className="stack-sm">
              <label className="label-md">Piece Title</label>
              <input
                className="input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sage Linen Co-ord"
                required
              />
            </div>
            
            <div className="stack-sm">
              <label className="label-md">Retail Price (₹)</label>
              <input
                className="input"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 3499"
                required
              />
            </div>

            <div className="stack-sm">
              <label className="label-md">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ appearance: "none" }}
              >
                <option value="Coordset">Coordset</option>
                <option value="Tops">Tops</option>
                <option value="Casual Luxury">Casual Luxury</option>
                <option value="Traditional Luxury">Traditional Luxury</option>
                <option value="Separates">Separates</option>
              </select>
            </div>
          </div>

          <div className="stack-sm" style={{ marginBottom: "16px" }}>
            <label className="label-md">Editorial Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a luxurious and rich narrative for the tailoring outline..."
              rows={4}
              required
            />
          </div>

          {/* SIZES */}
          <div className="stack-sm" style={{ marginBottom: "20px" }}>
            <label className="label-md">Tailored Patterns Available (Sizes)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {["XS", "S", "M", "L", "XL", "XXL"].map((size) => {
                const active = sizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    style={{
                      width: "44px",
                      height: "44px",
                      border: active ? "2px solid var(--color-charcoal)" : "1px solid var(--color-outline-variant)",
                      backgroundColor: active ? "var(--color-charcoal)" : "transparent",
                      color: active ? "var(--color-cream)" : "var(--color-charcoal)",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
          {/* IMAGES PANEL */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div className="stack-sm" style={{ gridColumn: "span 2" }}>
              <label className="label-md" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-charcoal)" }}>
                Garment Photography
              </label>
              
              {/* Image list container */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
                {productImages.length === 0 ? (
                  <div style={{ border: "1px dashed var(--color-outline-variant)", padding: "20px", textAlign: "center", color: "var(--color-on-surface-variant)" }}>
                    No photos uploaded yet. Select files below to add them to this capsule piece.
                  </div>
                ) : (
                  productImages.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      draggable="true"
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "12px",
                        border: "1px solid var(--color-outline-variant)",
                        backgroundColor: "var(--color-surface)",
                        cursor: "grab",
                        position: "relative",
                        transition: "box-shadow 0.2s, border-color 0.2s",
                      }}
                    >
                      {/* Drag Handle Icon */}
                      <div style={{ fontSize: "20px", color: "var(--color-on-surface-variant)", cursor: "grab", padding: "0 4px" }}>
                        ☰
                      </div>

                      {/* Thumbnail Preview with Zoom trigger */}
                      <div
                        onClick={() => openAdminZoom(img.imageUrl)}
                        style={{
                          width: "60px",
                          height: "80px",
                          border: "1px solid var(--color-outline-variant)",
                          overflow: "hidden",
                          cursor: "zoom-in",
                          backgroundColor: "var(--color-cream)",
                        }}
                      >
                        <img src={img.imageUrl} alt={`Preview ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>

                      {/* Info & Cover Badge */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-on-surface-variant)", textAlign: "left" }}>
                          IMAGE #{idx + 1}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {idx === 0 ? (
                            <span style={{ fontSize: "9px", fontWeight: 700, backgroundColor: "var(--color-ruby)", color: "var(--color-cream)", padding: "2px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              ★ Main Cover
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCoverProductImage(idx)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--color-charcoal)",
                                fontSize: "11px",
                                textDecoration: "underline",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              Make Cover
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {/* Replace image uploader */}
                        <label
                          htmlFor={`replace-file-${idx}`}
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--color-charcoal)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Replace
                        </label>
                        <input
                          id={`replace-file-${idx}`}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplaceProductImage(e, idx)}
                          style={{ display: "none" }}
                        />

                        {/* Delete image */}
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-ruby)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            fontSize: "11px",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Upload image selector */}
              <div style={{ marginTop: "16px", textAlign: "left" }}>
                <label
                  htmlFor="admin-upload-image"
                  className="btn btn-secondary"
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  {uploadingProductImage ? "Uploading files..." : "Upload New Images"}
                </label>
                <input
                  id="admin-upload-image"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleProductImageUpload}
                  disabled={uploadingProductImage}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>

            <div className="stack-sm">
              <label className="label-md">Tailor Highlights / Fabric Details</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  className="input"
                  type="text"
                  value={detailInput}
                  onChange={(e) => setDetailInput(e.target.value)}
                  placeholder="e.g. 100% premium soft-touch luxury viscose-blend"
                />
                <button type="button" className="btn btn-secondary" onClick={handleAddDetail}>Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {details.map((det, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "var(--color-cream)", padding: "4px 10px", fontSize: "12px", border: "1px solid var(--color-outline-variant)" }}>
                    {det.length > 20 ? det.slice(0, 18) + "..." : det}
                    <button type="button" onClick={() => handleRemoveDetail(i)} style={{ background: "none", border: "none", color: "var(--color-ruby)", cursor: "pointer", fontWeight: "bold" }}>×</button>
                  </span>
                ))}
              </div>
            </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : (editId ? "Update Product" : "Publish Capsule Piece")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* PRODUCTS DIRECTORY */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Piece Details</th>
              <th>Category</th>
              <th>Price</th>
              <th>Sizing Slates</th>
              <th>Stock Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--color-on-surface-variant)" }}>
                  No products found in the database.
                </td>
              </tr>
            ) : (
              products.map((prod) => (
              <tr key={prod.id}>
                <td>
                  <img
                    src={prod.images[0]}
                    alt={prod.title}
                    style={{ width: "50px", aspectRatio: "3/4", objectFit: "cover", border: "1px solid var(--color-outline-variant)" }}
                  />
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{prod.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--color-on-surface-variant)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {prod.description}
                  </div>
                </td>
                <td>
                  <span className="badge badge-primary">{prod.category}</span>
                </td>
                <td style={{ fontWeight: 700 }}>
                  ₹{prod.price.toLocaleString("en-IN")}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {prod.sizes.map((s) => (
                      <span key={s} style={{ fontSize: "10px", padding: "2px 6px", border: "1px solid var(--color-outline-variant)", fontWeight: 600 }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="badge badge-success">IN WARDROBE (ACTIVE)</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(prod)}>Edit</button>
                    <button
                      className="btn btn-sm"
                      style={{ backgroundColor: "var(--color-error-container)", color: "var(--color-error)" }}
                      onClick={() => handleDelete(prod.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Zoom Lightbox */}
      {adminZoomImage && (
        <div
          onClick={closeAdminZoom}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            cursor: 'zoom-out',
          }}
        >
          <img src={adminZoomImage} alt="Product Zoomed" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
