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
        showToast(error.message || 'Failed to load data.', 'error');
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
      showToast('A challan must have at least one line item.', 'error');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = async (status: ChallanStatus) => {
    if (!selectedCustomerId) {
      showToast('Select a customer.', 'error');
      return;
    }

    if (items.length === 0) {
      showToast('Add at least one product item.', 'error');
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
          ? `Challan ${res.challan.challanNumber} confirmed and stock deducted.`
          : `Draft challan ${res.challan.challanNumber} saved.`,
        'success',
      );
      navigate(`/challans/${res.challan.id}`);
    } catch (error: any) {
      showToast(error.message || 'Failed to create challan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div>
      <div className="action-bar">
        <div>
          <Link to="/challans" className="back-link">
            &larr; Sales Challans
          </Link>
          <h1 className="page-title">New challan</h1>
          <p className="page-subtitle">Create a delivery challan with inventory validation</p>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: form and line items */}
        <div className="detail-section">
          {/* Customer selection */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '12px' }}>Customer</h2>

            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label">Select customer</label>
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
                  padding: '10px 12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Address</span>
                  <span style={{ fontWeight: 500 }}>{selectedCustomer.address}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>Phone</span>
                  <span style={{ fontWeight: 500 }}>{selectedCustomer.mobile}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block' }}>GST</span>
                  <span style={{ fontWeight: 500 }}>{selectedCustomer.gstNumber || 'Unregistered'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Line items</h2>
                <p className="card-subtitle">Add products and quantities</p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddLineItem}>
                <PlusIcon size={14} />
                <span>Add item</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {items.map((item, index) => {
                const prod = products.find((p) => p.id === item.productId);
                const hasStock = prod ? prod.currentStock >= item.quantity : true;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 2fr) 80px 100px 80px 32px',
                      gap: '10px',
                      alignItems: 'end',
                    }}
                  >
                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Product</label>
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
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          <span style={{ color: hasStock ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 500 }}>
                            {hasStock
                              ? `${prod.currentStock} available`
                              : `Exceeds stock (${prod.currentStock} available)`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Unit price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(index, Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '11px' }}>Subtotal</label>
                      <div className="tabular" style={{ fontWeight: 600, paddingTop: '8px', fontSize: '13px' }}>
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={() => handleRemoveLineItem(index)}
                      title="Remove line item"
                      style={{ marginBottom: '2px' }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail: summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '76px' }}>
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Summary</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Line items</span>
                <span className="tabular" style={{ fontWeight: 600 }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total units</span>
                <span className="tabular" style={{ fontWeight: 600 }}>{totalQuantity}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>Total value</span>
                <span className="tabular" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)' }}>
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-success"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '10px' }}
                onClick={() => handleSubmit('CONFIRMED')}
              >
                {isSubmitting ? 'Processing...' : 'Confirm challan'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '8px' }}
                onClick={() => handleSubmit('DRAFT')}
              >
                Save as draft
              </button>
            </div>

            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Confirming verifies stock atomically and creates OUT movement records in the inventory ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
