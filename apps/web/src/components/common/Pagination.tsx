import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)',
        fontSize: '13px',
        color: 'var(--text-secondary)',
      }}
    >
      <div>
        Page <span className="tabular" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{currentPage}</span> of{' '}
        <span className="tabular" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalPages}</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({totalItems} records)</span>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          className="btn btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
