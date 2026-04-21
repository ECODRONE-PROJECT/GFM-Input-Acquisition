import { useEffect, useState, type FormEvent } from 'react';
import {
  createAdminInventoryItem,
  deleteAdminInventoryItem,
  fetchAdminInventory,
  type InventoryItem,
  updateAdminInventoryItem,
} from '../lib/adminInventory';
import { createAdminAggregateDeal } from '../lib/adminAggregateDeals';
import { AestheticDateTimePicker } from '../components/AestheticDateTimePicker';

type InventoryFormState = {
  id: string;
  name: string;
  type: string;
  price: string;
  stock: string;
  location: string;
  imageUrl: string;
  size: string;
  weight: string;
  brand: string;
};

type BulkDealFormState = {
  title: string;
  discount_percent: string;
  target_quantity: string;
  min_join_quantity: string;
  max_join_quantity: string;
  end_at: string;
  status: 'draft' | 'active';
};

const EMPTY_FORM: InventoryFormState = {
  id: '',
  name: '',
  type: 'SEED',
  price: '',
  stock: '',
  location: '',
  imageUrl: '',
  size: '',
  weight: '',
  brand: 'Grow For Me',
};

const EMPTY_BULK_FORM: BulkDealFormState = {
  title: '',
  discount_percent: '10',
  target_quantity: '',
  min_join_quantity: '1',
  max_join_quantity: '',
  end_at: '',
  status: 'active',
};

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');
const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const DEFAULT_CATALOG_PAGE_SIZE = 5;

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const INVENTORY_CATEGORIES = [
  'SEED', 'FERTILIZER', 'CHEMICAL', 'TOOL', 'EQUIPMENT', 'NUTRIENT', 
  'PESTICIDE', 'LIVESTOCK', 'FEED', 'VETERINARY', 'IRRIGATION', 'SERVICE'
];

function asNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

function asMoney(value: number) {
  return `GHS ${MONEY_FORMATTER.format(value)}`;
}

function asCategoryLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toForm(item: InventoryItem): InventoryFormState {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    price: String(item.price),
    stock: String(item.stock),
    location: item.location || '',
    imageUrl: item.imageUrl || '',
    size: item.size || '',
    weight: item.weight || '',
    brand: item.brand || '',
  };
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<InventoryFormState>(EMPTY_FORM);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [bulkSourceItem, setBulkSourceItem] = useState<InventoryItem | null>(null);
  const [bulkForm, setBulkForm] = useState<BulkDealFormState>(EMPTY_BULK_FORM);
  const [creatingBulk, setCreatingBulk] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_CATALOG_PAGE_SIZE);
  const [isPageSizeDropdownOpen, setIsPageSizeDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const loadInventory = async (quiet = false) => {
    if (!quiet) {
      setLoading(true);
    }
    setError('');
    try {
      const data = await fetchAdminInventory();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory.');
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInventory();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!success) {
      return;
    }
    const timer = window.setTimeout(() => setSuccess(''), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm(toForm(item));
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSaving(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const onFormChange = (key: keyof InventoryFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!name) {
      setError('Item name is required.');
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError('Price must be a valid non-negative number.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a valid non-negative integer.');
      return;
    }

    const payload = {
      name,
      type: form.type,
      price,
      stock,
      location: form.location.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      size: form.size.trim() || null,
      weight: form.weight.trim() || null,
      brand: form.brand.trim() || null,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateAdminInventoryItem(editingId, payload);
        setSuccess('Inventory item updated.');
      } else {
        await createAdminInventoryItem({
          id: form.id.trim() || undefined,
          ...payload,
        });
        setSuccess('Inventory item created.');
      }
      closeModal();
      await loadInventory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inventory save failed.');
    } finally {
      setSaving(false);
    }
  };

  const askDelete = (item: InventoryItem) => {
    setDeletingItem(item);
    setDeletePassword('');
    setError('');
  };

  const closeDelete = () => {
    setDeleting(false);
    setDeletingItem(null);
    setDeletePassword('');
  };

  const confirmDelete = async () => {
    if (!deletingItem) {
      return;
    }
    setError('');
    if (!deletePassword.trim()) {
      setError('Enter your admin password to confirm deletion.');
      return;
    }
    setDeleting(true);
    try {
      await deleteAdminInventoryItem(deletingItem.id, deletePassword);
      setSuccess(`Deleted ${deletingItem.name}.`);
      closeDelete();
      await loadInventory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete inventory item.');
    } finally {
      setDeleting(false);
    }
  };

  const openBulkModal = (item: InventoryItem) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setBulkSourceItem(item);
    setBulkForm({
      title: `${item.name} Group Bulk Buy`,
      discount_percent: '10',
      target_quantity: String(Math.max(item.stock, 20)),
      min_join_quantity: '1',
      max_join_quantity: '',
      end_at: localIso,
      status: 'active',
    });
    setError('');
  };

  const closeBulkModal = () => {
    setCreatingBulk(false);
    setBulkSourceItem(null);
    setBulkForm(EMPTY_BULK_FORM);
  };

  const onBulkFormChange = (key: keyof BulkDealFormState, value: string) => {
    setBulkForm((prev) => ({ ...prev, [key]: value }));
  };

  const createBulkFromInventory = async (e: FormEvent) => {
    e.preventDefault();
    if (!bulkSourceItem) {
      return;
    }
    setError('');
    setSuccess('');

    const discount = Number(bulkForm.discount_percent);
    const target = Number(bulkForm.target_quantity);
    const minJoin = Number(bulkForm.min_join_quantity || '1');
    const maxJoin = bulkForm.max_join_quantity ? Number(bulkForm.max_join_quantity) : null;

    if (!bulkForm.title.trim()) {
      setError('Bulk deal title is required.');
      return;
    }
    if (Number.isNaN(discount) || discount < 0 || discount > 95) {
      setError('Discount must be between 0 and 95.');
      return;
    }
    if (!Number.isInteger(target) || target < 1) {
      setError('Target quantity must be a positive whole number.');
      return;
    }
    if (!Number.isInteger(minJoin) || minJoin < 1) {
      setError('Minimum join quantity must be a positive whole number.');
      return;
    }
    if (maxJoin !== null && (!Number.isInteger(maxJoin) || maxJoin < minJoin)) {
      setError('Max join quantity must be a whole number greater than or equal to min join quantity.');
      return;
    }

    setCreatingBulk(true);
    try {
      await createAdminAggregateDeal({
        title: bulkForm.title.trim(),
        description: `${bulkSourceItem.name} moved from inventory to a community bulk-buy campaign.`,
        deal_type: 'bulk',
        item_name: bulkSourceItem.name,
        item_category: bulkSourceItem.type,
        unit: bulkSourceItem.weight || bulkSourceItem.size || 'unit',
        image_url: bulkSourceItem.imageUrl || null,
        base_price: bulkSourceItem.price,
        discount_percent: discount,
        target_quantity: target,
        min_join_quantity: minJoin,
        max_join_quantity: maxJoin,
        end_at: bulkForm.end_at ? new Date(bulkForm.end_at).toISOString() : null,
        status: bulkForm.status,
        source_inventory_item_id: bulkSourceItem.id,
        reserve_inventory_quantity: target,
      });
      setSuccess(`Bulk deal created for ${bulkSourceItem.name}.`);
      closeBulkModal();
      await loadInventory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create bulk deal from inventory.');
    } finally {
      setCreatingBulk(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      item.name.toLowerCase().includes(q)
      || item.id.toLowerCase().includes(q)
      || (item.brand || '').toLowerCase().includes(q)
      || item.type.toLowerCase().includes(q)
    );
  });

  const totalStockValue = filteredItems.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const hasMultiplePages = totalPages > 1;
  const safeCurrentPage = totalPages === 0 ? 1 : Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = filteredItems.length === 0 ? 0 : Math.min(startIndex + pageSize, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (totalPages === 0) {
        return 1;
      }
      return Math.min(Math.max(prev, 1), totalPages);
    });
  }, [totalPages]);

  const visibleStartPage = Math.max(1, safeCurrentPage - 2);
  const visibleEndPage = Math.min(totalPages, visibleStartPage + 4);
  const visiblePageStartAdjusted = Math.max(1, visibleEndPage - 4);
  const visiblePages: number[] = [];
  for (let page = visiblePageStartAdjusted; page <= visibleEndPage; page += 1) {
    visiblePages.push(page);
  }

  return (
    <section className="w-full min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <span className="text-[#a41034] text-[10px] font-bold tracking-widest uppercase mb-1 block">Stock Management</span>
          <h1 className="text-3xl font-headline font-extrabold text-[#1a1c1b] tracking-tight">Product Inventory</h1>
          <p className="text-sm text-stone-500 mt-2">Add, edit, and manage all inventory categories in real time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadInventory()}
            className="flex items-center gap-2 bg-[#e8e8e5] text-[#1a1c1b] px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-stone-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span> Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#0d631b] text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#0b5015] transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span> Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-lg font-semibold text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-[#d8f8d5] text-[#0c5f14] px-4 py-3 rounded-lg font-semibold text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-stone-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-stone-500 font-semibold">Items</p>
          <p className="text-3xl font-headline font-extrabold text-stone-900 mt-2">{asNumber(filteredItems.length)}</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-stone-500 font-semibold">Total Units</p>
          <p className="text-3xl font-headline font-extrabold text-stone-900 mt-2">
            {asNumber(filteredItems.reduce((sum, item) => sum + item.stock, 0))}
          </p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-stone-500 font-semibold">Stock Value</p>
          <p className="text-3xl font-headline font-extrabold text-stone-900 mt-2">{asMoney(totalStockValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-stone-100 flex flex-col md:flex-row gap-3 md:gap-4 md:items-center md:justify-between">
          <h3 className="text-xl font-bold font-headline text-stone-900">Catalog Inventory</h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, id, type or brand..."
            className="w-full md:w-[280px] lg:w-[300px] h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none focus:ring-2 focus:ring-[#0d631b]/25"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#f4f4f1] text-[#40493d] text-xs font-bold uppercase tracking-widest border-b border-stone-200/50">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Unit Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-stone-500" colSpan={7}>
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-stone-500" colSpan={7}>
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-stone-900">{item.name}</p>
                      <p className="text-xs text-stone-500 mt-1">{item.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-[#f9fafb] text-[#374151] border border-[#f3f4f6] px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest shadow-sm inline-block">
                        {asCategoryLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-stone-700">{asMoney(item.price)}</td>
                    <td className="px-4 py-4 font-semibold text-stone-900">{asNumber(item.stock)}</td>
                    <td className="px-4 py-4 text-stone-600">{item.brand || '-'}</td>
                    <td className="px-4 py-4 text-stone-600">{item.location || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openBulkModal(item)}
                          className="h-9 px-3 rounded-lg bg-[#e4f6e6] hover:bg-[#d3f0d7] text-xs font-bold text-[#0c5f14]"
                        >
                          Bulk Buy
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="h-9 px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-xs font-bold text-stone-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => askDelete(item)}
                          className="h-9 px-3 rounded-lg bg-[#ffdad6] hover:bg-[#ffcfc8] text-xs font-bold text-[#93000a]"
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

        {!loading && filteredItems.length > 0 && (
          <div className="px-4 md:px-6 py-4 border-t border-stone-100 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#f9f9f6]">
            <div className="flex items-center gap-3 text-xs text-stone-600">
              <p className="font-medium">
                Showing {asNumber(startIndex + 1)} to {asNumber(endIndex)} of {asNumber(filteredItems.length)} items
              </p>
              <label className="flex items-center gap-2">
                Rows:
                <div className="relative">
                  <button
                    onClick={() => setIsPageSizeDropdownOpen(!isPageSizeDropdownOpen)}
                    className="h-8 px-2 min-w-[60px] rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 flex items-center justify-between gap-1 shadow-sm hover:hover:border-[#0d631b]/30 transition-all"
                  >
                    {pageSize}
                    <span className={`material-symbols-outlined text-[14px] transition-transform ${isPageSizeDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {isPageSizeDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsPageSizeDropdownOpen(false)} />
                      <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-stone-100 p-1 z-50 min-w-[60px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <button
                            key={size}
                            onClick={() => {
                              setPageSize(size);
                              setCurrentPage(1);
                              setIsPageSizeDropdownOpen(false);
                            }}
                            className={`w-full text-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              pageSize === size 
                                ? 'bg-[#0d631b]/5 text-[#0d631b]' 
                                : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
            {hasMultiplePages && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="h-9 px-3 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40"
                >
                  Prev
                </button>
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 min-w-9 px-3 rounded-lg text-xs font-bold border ${
                      page === safeCurrentPage
                        ? 'bg-[#0d631b] text-white border-[#0d631b]'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="h-9 px-3 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h4 className="font-headline font-bold text-xl text-stone-900">
                {editingId ? 'Edit Inventory Item' : 'Add Inventory Item'}
              </h4>
              <button onClick={closeModal} className="text-stone-500 hover:text-stone-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitForm}>
              {!editingId && (
                <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                  Item ID (optional)
                  <input
                    value={form.id}
                    onChange={(e) => onFormChange('id', e.target.value)}
                    placeholder="e.g. seed-maize-001"
                    className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Name
                <input
                  value={form.name}
                  onChange={(e) => onFormChange('name', e.target.value)}
                  required
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <div className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Category
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex items-center justify-between h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 text-sm font-bold text-stone-700 outline-none hover:border-[#0d631b]/30 transition-all active:scale-[0.99]"
                  >
                    {asCategoryLabel(form.type || 'Select Category')}
                    <span className={`material-symbols-outlined text-[18px] text-stone-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                  </button>

                  {isCategoryDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                      <div className="absolute top-1/2 left-0 right-0 mt-6 bg-white rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-stone-100 p-1.5 z-50 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="space-y-1">
                          {INVENTORY_CATEGORIES.map((category) => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                onFormChange('type', category);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                form.type === category 
                                  ? 'bg-[#0d631b]/5 text-[#0d631b]' 
                                  : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                              }`}
                            >
                              {asCategoryLabel(category)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Brand
                <input
                  value={form.brand}
                  onChange={(e) => onFormChange('brand', e.target.value)}
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Unit Price (GHS)
                <input
                  value={form.price}
                  onChange={(e) => onFormChange('price', e.target.value)}
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Bulk Stock
                <input
                  value={form.stock}
                  onChange={(e) => onFormChange('stock', e.target.value)}
                  required
                  type="number"
                  min="0"
                  step="1"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Location
                <input
                  value={form.location}
                  onChange={(e) => onFormChange('location', e.target.value)}
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Image URL
                <input
                  value={form.imageUrl}
                  onChange={(e) => onFormChange('imageUrl', e.target.value)}
                  placeholder="/seed.png"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Size
                <input
                  value={form.size}
                  onChange={(e) => onFormChange('size', e.target.value)}
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Weight
                <input
                  value={form.weight}
                  onChange={(e) => onFormChange('weight', e.target.value)}
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-11 px-4 rounded-lg bg-stone-200 text-stone-800 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-4 rounded-lg bg-[#0d631b] text-white font-bold text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingItem && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-100">
              <h4 className="font-headline font-bold text-xl text-stone-900">Confirm Delete</h4>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-stone-700">
                Deleting <span className="font-bold">{deletingItem.name}</span> is permanent.
                Enter your admin password to continue.
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                placeholder="Admin password"
              />
              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={closeDelete}
                  className="h-10 px-4 rounded-lg bg-stone-200 text-stone-800 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="h-10 px-4 rounded-lg bg-[#93000a] text-white font-bold text-sm disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkSourceItem && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[3px] z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <h4 className="font-headline font-bold text-xl text-stone-900">Create Bulk Buy</h4>
              <button onClick={closeBulkModal} className="text-stone-500 hover:text-stone-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={createBulkFromInventory}>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Deal Title
                <input
                  value={bulkForm.title}
                  onChange={(e) => onBulkFormChange('title', e.target.value)}
                  required
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <div className="md:col-span-2 text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded-lg px-3 py-2">
                Item: <span className="font-bold text-stone-700">{bulkSourceItem.name}</span> | Base price: <span className="font-bold text-stone-700">{asMoney(bulkSourceItem.price)}</span>
              </div>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Discount %
                <input
                  value={bulkForm.discount_percent}
                  onChange={(e) => onBulkFormChange('discount_percent', e.target.value)}
                  type="number"
                  min="0"
                  max="95"
                  step="0.01"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Target Quantity
                <input
                  value={bulkForm.target_quantity}
                  onChange={(e) => onBulkFormChange('target_quantity', e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Min Join Quantity
                <input
                  value={bulkForm.min_join_quantity}
                  onChange={(e) => onBulkFormChange('min_join_quantity', e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Max Join Quantity (Optional)
                <input
                  value={bulkForm.max_join_quantity}
                  onChange={(e) => onBulkFormChange('max_join_quantity', e.target.value)}
                  type="number"
                  min="1"
                  step="1"
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                />
              </label>
              <AestheticDateTimePicker
                label="Ends At"
                value={bulkForm.end_at}
                onChange={(val) => onBulkFormChange('end_at', val)}
                className="md:col-span-1"
              />
              <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700">
                Status
                <select
                  value={bulkForm.status}
                  onChange={(e) => onBulkFormChange('status', e.target.value as 'draft' | 'active')}
                  className="h-11 px-3 rounded-lg bg-stone-100 border border-stone-200 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBulkModal}
                  className="h-11 px-4 rounded-lg bg-stone-200 text-stone-800 font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBulk}
                  className="h-11 px-4 rounded-lg bg-[#0d631b] text-white font-bold text-sm disabled:opacity-60"
                >
                  {creatingBulk ? 'Creating...' : 'Create Bulk Buy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
