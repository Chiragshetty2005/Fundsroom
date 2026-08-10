import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PlusIcon, TrashIcon } from '../components/common/Icons';
import type { ChallanStatus, Customer, PaginatedResponse, Product, SalesChallan } from '../types';

interface LineItemDraft {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const CreateChallanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [items, setItems] = useState<LineItemDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadMasters() {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get<PaginatedResponse<Customer>>('/customers?limit=100'),
          api.get<PaginatedResponse<Product>>('/products?limit=100'),
        ]);

        setCustomers(custRes.data);
        setProducts(prodRes.data);

        if (!selectedCustomerId && custRes.data.length > 0) {
          setSelectedCustomerId(custRes.data[0].id);
        }

        if (prodRes.data.length > 0 && items.length === 0) {
          setItems([
            {
              id: Math.random().toString(),
              productId: prodRes.data[0].id,
              quantity: 1,
              unitPrice: Number(prodRes.data[0].unitPrice),
            },
          ]);
        }
      } catch (error: any) {
        showToast(error.message || 'Failed to load master records.', 'error');
      }
    }

    loadMasters();
  }, []);

  const handleProductChange = (index: number, newProductId: string) => {
    const prod = products.find((p) => p.id === newProductId);
    if (!prod) return;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: newProductId,
        unitPrice: Number(prod.unitPrice),
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        quantity: Math.max(1, quantity),
      };
      return updated;
    });
  };

  const handlePriceChange = (index: number, unitPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unitPrice: Math.max(0, unitPrice),
      };
      return updated;
    });
  };

  const handleAddLineItem = () => {
    if (products.length === 0) return;
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        productId: products[0].id,
        quantity: 1,
        unitPrice: Number(products[0].unitPrice),
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (items.length <= 1) {
      showToast('A sales challan must contain at least one line item.', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (status: ChallanStatus) => {
    if (!selectedCustomerId) {
      showToast('Please select a customer.', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Please add at least one product item.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId,
        status,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      };

      const res = await api.post<{ challan: SalesChallan }>('/challans', payload);
      showToast(
        status === 'CONFIRMED'
          ? `Challan #${res.challan.challanNumber} issued & stock deducted!`
          : `Draft Challan #${res.challan.challanNumber} saved.`,
        'success',
      );
      navigate(`/challans/${res.challan.id}`);
    } catch (error: any) {
      showToast(error.message || 'Failed to create sales challan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div>
      {/* Header */}
      <div className="action-bar">
        <div>
          <Link
            to="/challans"
            style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}
          >
            &larr; Back to Challan List
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            New Sales Challan Generator
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Draft or issue customer dispatch challans with real-time inventory validation
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Form & Line Item Builder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer Selection Card */}
          <div className="glass-card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>1. Customer & Dispatch Destination</h2>
            
            <div className="form-group">
              <label className="form-label">Select Customer Account *</label>
              <select
                className="form-select"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.businessName} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-input)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Delivery Address</span>
                  <strong>{selectedCustomer.address}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>Contact Phone</span>
                  <strong>{selectedCustomer.mobile}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block' }}>GST Identification</span>
                  <span>{selectedCustomer.gstNumber || 'Unregistered'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Card */}
          <div className="glass-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">2. Order Line Items</h2>
                <p className="card-subtitle">Add products and quantities for this shipment</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                <PlusIcon size={16} />
                <span>Add Product</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const hasStock = prod ? prod.currentStock >= item.quantity : true;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-input)',
                      border: `1px solid ${hasStock ? 'var(--border-subtle)' : 'var(--danger-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 2fr) 100px 120px 100px 40px',
                      gap: '0.85rem',
                      alignItems: 'center',
                    }}
                  >
                    {/* Product Selector */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Product Item</label>
                      <select
                        className="form-select"
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      {prod && (
                        <div style={{ fontSize: '0.75rem', marginTop: '0.35rem' }}>
                          <span style={{ color: hasStock ? '#34d399' : '#f87171', fontWeight: 600 }}>
                            {hasStock
                              ? `✓ Available in Stock: ${prod.currentStock} units`
                              : `⚠️ Exceeds Available Stock (${prod.currentStock} available)`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                      />
                    </div>

                    {/* Line Subtotal */}
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Subtotal</label>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', paddingTop: '0.4rem' }}>
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>

                    {/* Remove Action */}
                    <div style={{ paddingTop: '1.25rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-icon"
                        onClick={() => handleRemoveLineItem(index)}
                        title="Remove Line Item"
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Execution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px' }}>
          <div className="glass-card">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>Challan Summary</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Product Lines</span>
                <strong>{items.length} items</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Dispatch Units</span>
                <strong style={{ color: '#fff' }}>{totalQuantity} units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 600 }}>Total Value</span>
                <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-success"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.85rem' }}
                onClick={() => handleSubmit('CONFIRMED')}
              >
                {isSubmitting ? 'Processing...' : '✓ Confirm & Deduct Stock'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={() => handleSubmit('DRAFT')}
              >
                Save as Draft
              </button>
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
              * <strong>Confirm</strong> verifies stock atomically and immediately creates OUT movement records in the inventory ledger.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
