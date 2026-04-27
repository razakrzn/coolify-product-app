import { useState, useEffect } from 'react'

const API = '/api'

const categoryColors = {
  Electronics: { bg: '#e8f4fd', text: '#1a6fa8', dot: '#2196F3' },
  Accessories: { bg: '#fef3e8', text: '#a85c1a', dot: '#FF9800' },
}

const toNumber = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const normalizeProduct = (product) => ({
  ...product,
  price: toNumber(product.price),
  stock: Math.trunc(toNumber(product.stock)),
})

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: 'Electronics', stock: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/products`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data.map(normalizeProduct) : [])
      setError(null)
    } catch (e) {
      setError('Cannot connect to API. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: toNumber(form.price),
          stock: Math.trunc(toNumber(form.stock)),
        })
      })
      if (!res.ok) throw new Error('Failed to add product')
      const data = await res.json()
      setProducts(prev => [...prev, normalizeProduct(data)])
      setForm({ name: '', price: '', category: 'Electronics', stock: '' })
      setShowForm(false)
      showToast('Product added!')
    } catch {
      showToast('Failed to add product', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete product')
      setProducts(prev => prev.filter(p => p.id !== id))
      showToast('Product removed')
    } catch {
      showToast('Failed to delete', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const totalValue = products.reduce((sum, p) => sum + toNumber(p.price) * toNumber(p.stock), 0)

  return (
    <div style={styles.root}>
      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === 'error' ? '#ff4444' : '#1a1a1a' }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={styles.badge}>COOLIFY TEST DEPLOY</div>
            <h1 style={styles.title}>Product Store</h1>
            <p style={styles.subtitle}>Vite + React · Express API · Docker Compose</p>
          </div>
          <button style={styles.addBtn} onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cancel' : '+ Add Product'}
          </button>
        </div>

        {/* Stats */}
        <div style={styles.stats}>
          {[
            { label: 'Total Products', value: products.length },
            { label: 'Total Stock', value: products.reduce((s, p) => s + toNumber(p.stock), 0) },
            { label: 'Inventory Value', value: `$${totalValue.toFixed(2)}` },
            { label: 'Categories', value: [...new Set(products.map(p => p.category))].length },
          ].map(s => (
            <div key={s.label} style={styles.stat}>
              <div style={styles.statVal}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <main style={styles.main}>
        {/* Add Form */}
        {showForm && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>New Product</h2>
            <div style={styles.formGrid}>
              {[
                { key: 'name', label: 'Product Name', placeholder: 'e.g. Wireless Headset', type: 'text' },
                { key: 'price', label: 'Price ($)', placeholder: '0.00', type: 'number' },
                { key: 'stock', label: 'Stock Qty', placeholder: '0', type: 'number' },
              ].map(f => (
                <div key={f.key} style={styles.formField}>
                  <label style={styles.label}>{f.label}</label>
                  <input
                    style={styles.input}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={styles.formField}>
                <label style={styles.label}>Category</label>
                <select style={styles.input} value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}>
                  <option>Electronics</option>
                  <option>Accessories</option>
                </select>
              </div>
            </div>
            <button style={{ ...styles.addBtn, marginTop: 12 }} onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        )}

        {/* Products */}
        {loading ? (
          <div style={styles.center}>
            <div style={styles.spinner} />
            <p style={{ color: '#999', marginTop: 16 }}>Connecting to API...</p>
          </div>
        ) : error ? (
          <div style={styles.errorBox}>
            <div style={{ fontSize: 32 }}>⚠️</div>
            <p style={{ color: '#c0392b', fontWeight: 600 }}>{error}</p>
            <button style={styles.retryBtn} onClick={fetchProducts}>Retry</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {products.map(p => {
              const cat = categoryColors[p.category] || { bg: '#f0f0f0', text: '#555', dot: '#999' }
              return (
                <div key={p.id} style={styles.card}>
                  <div style={styles.cardTop}>
                    <span style={{ ...styles.catBadge, background: cat.bg, color: cat.text }}>
                      <span style={{ ...styles.catDot, background: cat.dot }} />
                      {p.category}
                    </span>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(p.id)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? '...' : '✕'}
                    </button>
                  </div>
                  <div style={styles.productId}>#{p.id}</div>
                  <h3 style={styles.productName}>{p.name}</h3>
                  <div style={styles.cardBottom}>
                    <span style={styles.price}>${toNumber(p.price).toFixed(2)}</span>
                    <span style={{ ...styles.stockBadge, color: p.stock < 20 ? '#e74c3c' : '#27ae60' }}>
                      {p.stock} in stock
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#f5f4f0',
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
  },
  toast: {
    position: 'fixed', top: 20, right: 20, zIndex: 999,
    color: '#fff', padding: '12px 20px', borderRadius: 8,
    fontWeight: 500, fontSize: 14, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    animation: 'slideIn 0.3s ease',
  },
  header: {
    background: '#1a1a1a',
    color: '#fff',
    padding: '32px 40px 0',
  },
  headerInner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    maxWidth: 1100, margin: '0 auto',
  },
  badge: {
    display: 'inline-block',
    background: '#f0e040', color: '#1a1a1a',
    fontSize: 10, fontWeight: 700, letterSpacing: 2,
    padding: '4px 10px', borderRadius: 4, marginBottom: 12,
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontSize: 42, fontWeight: 800, margin: '0 0 6px',
    letterSpacing: -1,
  },
  subtitle: {
    color: '#888', fontSize: 13, margin: 0,
    fontFamily: 'monospace', letterSpacing: 0.5,
  },
  addBtn: {
    background: '#f0e040', color: '#1a1a1a',
    border: 'none', borderRadius: 8,
    padding: '12px 22px', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: "'Syne', sans-serif",
  },
  stats: {
    display: 'flex', gap: 0,
    maxWidth: 1100, margin: '32px auto 0',
    borderTop: '1px solid #333',
  },
  stat: {
    flex: 1, padding: '20px 0', borderRight: '1px solid #333',
    paddingRight: 24, paddingLeft: 0, marginRight: 24,
  },
  statVal: { fontSize: 28, fontWeight: 700, fontFamily: "'Syne', sans-serif" },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2, letterSpacing: 0.5 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 40px' },
  formCard: {
    background: '#fff', borderRadius: 12, padding: 28,
    marginBottom: 28, border: '2px solid #f0e040',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  formTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, margin: '0 0 20px',
  },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  formField: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#666', letterSpacing: 0.5 },
  input: {
    padding: '10px 14px', border: '1.5px solid #e0e0e0',
    borderRadius: 8, fontSize: 14, outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
    background: '#fafafa',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff', borderRadius: 12, padding: 22,
    border: '1.5px solid #ebebeb',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  catBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 600, padding: '4px 10px',
    borderRadius: 20, letterSpacing: 0.3,
  },
  catDot: { width: 6, height: 6, borderRadius: '50%', display: 'inline-block' },
  deleteBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: '#ccc', fontSize: 14, padding: '4px 8px',
    borderRadius: 6, transition: 'color 0.2s, background 0.2s',
  },
  productId: { fontSize: 11, color: '#bbb', fontFamily: 'monospace' },
  productName: {
    fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700,
    margin: 0, lineHeight: 1.3,
  },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  price: { fontSize: 22, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: '#1a1a1a' },
  stockBadge: { fontSize: 12, fontWeight: 600 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0' },
  spinner: {
    width: 36, height: 36, border: '3px solid #e0e0e0',
    borderTopColor: '#1a1a1a', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    textAlign: 'center', padding: '60px 20px',
    background: '#fff', borderRadius: 12, border: '1.5px solid #ffd0d0',
  },
  retryBtn: {
    marginTop: 12, background: '#1a1a1a', color: '#fff',
    border: 'none', padding: '10px 24px', borderRadius: 8,
    cursor: 'pointer', fontWeight: 600,
  },
}
