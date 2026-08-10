import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { SearchIcon } from './Icons';
import type { Customer, PaginatedResponse, Product, SalesChallan } from '../../types';

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'challan';
  title: string;
  subtitle: string;
  path: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Open/close on Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (term: string) => {
    setIsSearching(true);
    const items: SearchResult[] = [];

    try {
      const [customerRes, productRes, challanRes] = await Promise.allSettled([
        api.get<PaginatedResponse<Customer>>('/customers', { params: { search: term, limit: 5 } }),
        api.get<PaginatedResponse<Product>>('/products', { params: { search: term, limit: 5 } }),
        api.get<PaginatedResponse<SalesChallan>>('/challans', { params: { search: term, limit: 5 } }),
      ]);

      if (customerRes.status === 'fulfilled') {
        customerRes.value.data.forEach((c) => {
          items.push({
            id: c.id,
            type: 'customer',
            title: c.name,
            subtitle: `${c.businessName} · ${c.type}`,
            path: `/customers/${c.id}`,
          });
        });
      }

      if (productRes.status === 'fulfilled') {
        productRes.value.data.forEach((p) => {
          items.push({
            id: p.id,
            type: 'product',
            title: p.name,
            subtitle: `${p.sku} · ${p.category}`,
            path: '/products',
          });
        });
      }

      if (challanRes.status === 'fulfilled') {
        challanRes.value.data.forEach((ch) => {
          items.push({
            id: ch.id,
            type: 'challan',
            title: ch.challanNumber,
            subtitle: `${ch.customer?.name || 'Customer'} · ${ch.status}`,
            path: `/challans/${ch.id}`,
          });
        });
      }
    } catch {
      // silently fail
    }

    setResults(items);
    setSelectedIndex(0);
    setIsSearching(false);
  };

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      navigate(result.path);
    },
    [navigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  const grouped = {
    customer: results.filter((r) => r.type === 'customer'),
    product: results.filter((r) => r.type === 'product'),
    challan: results.filter((r) => r.type === 'challan'),
  };

  const typeLabels: Record<string, string> = {
    customer: 'Customers',
    product: 'Products',
    challan: 'Challans',
  };

  let flatIndex = -1;

  return (
    <div className="cmd-palette-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <SearchIcon size={16} className="search-icon" />
          <input
            ref={inputRef}
            className="cmd-palette-input"
            placeholder="Search customers, products, challans..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ paddingLeft: 0, borderBottom: 'none' }}
          />
        </div>
        <div style={{ borderBottom: '1px solid var(--border)' }} />

        <div className="cmd-palette-results">
          {!query.trim() && (
            <div className="cmd-palette-empty">
              Type to search across customers, products, and challans
            </div>
          )}

          {query.trim() && results.length === 0 && !isSearching && (
            <div className="cmd-palette-empty">
              No results found for "{query}"
            </div>
          )}

          {query.trim() && isSearching && results.length === 0 && (
            <div className="cmd-palette-empty">Searching...</div>
          )}

          {(['customer', 'product', 'challan'] as const).map((type) => {
            const group = grouped[type];
            if (group.length === 0) return null;

            return (
              <div key={type}>
                <div className="cmd-palette-group-title">{typeLabels[type]}</div>
                {group.map((result) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <div
                      key={result.id}
                      className={`cmd-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span style={{ fontWeight: 500 }}>{result.title}</span>
                      <span className="cmd-palette-item-meta">{result.subtitle}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cmd-palette-hint">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
