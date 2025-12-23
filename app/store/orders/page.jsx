"use client";
export const dynamic = 'force-dynamic'
import { useEffect, useState } from "react"
import Loading from "@/components/Loading"
import { orderDummyData } from "@/assets/assets"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import toast from "react-hot-toast"
import { Package, Truck, X, Download, Printer, FileSpreadsheet } from "lucide-react"
import { downloadInvoiceHTML, printInvoiceHTML } from "@/lib/generateInvoiceHTML"
import { downloadAwbBill } from "@/lib/generateAwbBill"
import * as XLSX from 'xlsx';

// Add updateTrackingDetails function
// (must be inside the component, not top-level)




export default function StoreOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED';
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trackingData, setTrackingData] = useState({
        trackingId: '',
        trackingUrl: '',
        courier: ''
    });

    const { getToken } = useAuth();

    // Function to update tracking details and notify customer
    const updateTrackingDetails = async () => {
        if (!selectedOrder) return;
        try {
            const token = await getToken();
            await axios.post('/api/store/orders/update-tracking', {
                orderId: selectedOrder.id,
                ...trackingData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Tracking details updated & customer notified!');
            // Optionally refresh orders or close modal
            fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            toast.error('Failed to update tracking details');
        }
    };
    // Move openModal and closeModal to top level
    const openModal = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const fetchOrders = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get('/api/store/orders', {headers: { Authorization: `Bearer ${token}` }});
            console.log('[FRONTEND ORDERS API RESPONSE]', data);
            setOrders(data.orders);
        } catch (error) {
            console.error('[FRONTEND ORDERS API ERROR]', error);
            toast.error(error?.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId, status) => {
        try {
            const token = await getToken();
            await axios.post('/api/store/orders', { orderId, status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrders(prev => prev.map(order => order.id === orderId ? { ...order, status } : order));
            toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message);
        }
    };

    const statusFilters = [
        { key: 'ALL', label: 'All' },
        { key: 'ORDER_PLACED', label: 'Order Placed' },
        { key: 'PROCESSING', label: 'Processing' },
        { key: 'SHIPPED', label: 'Shipped' },
        { key: 'DELIVERED', label: 'Delivered' },
        { key: 'CANCELLED', label: 'Cancelled' },
        { key: 'RETURNED', label: 'Returned' },
    ];

    const statusCounts = orders.reduce((acc, order) => {
        acc.ALL = (acc.ALL || 0) + 1;
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
    }, {});

    const filteredOrders = statusFilter === 'ALL'
        ? orders
        : orders.filter(order => order.status === statusFilter);

    const exportToExcel = () => {
        const exportData = filteredOrders.map((order, index) => ({
            'Sr. No.': index + 1,
            'Order ID': order.id.slice(0, 8).toUpperCase(),
            'Order Number': order.id,
            'Customer Name': order.isGuest ? order.guestName : order.user?.name,
            'Customer Email': order.isGuest ? order.guestEmail : order.user?.email,
            'Customer Phone': order.isGuest ? order.guestPhone : order.address?.phone,
            'Customer Type': order.isGuest ? 'Guest' : 'Registered',
            'Total Amount': `${currency}${Number(order.total).toFixed(2)}`,
            'Payment Method': order.paymentMethod,
            'Payment Status': order.isPaid ? 'PAID' : 'UNPAID',
            'Order Status': order.status,
            'Coupon Used': order.isCouponUsed ? order.coupon?.code : 'No',
            'Tracking ID': order.trackingId || 'N/A',
            'Courier': order.courier || 'N/A',
            'Tracking URL': order.trackingUrl || 'N/A',
            'Shipping Address': `${order.address?.street}, ${order.address?.city}, ${order.address?.state}, ${order.address?.zip}, ${order.address?.country}`,
            'Address Name': order.address?.name,
            'Address Phone': order.address?.phone,
            'Products': order.orderItems?.map(item => `${item.product?.name} (Qty: ${item.quantity})`).join('; '),
            'Order Date': new Date(order.createdAt).toLocaleString(),
            'Last Updated': new Date(order.updatedAt).toLocaleString(),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Orders');
        
        // Auto-size columns
        const maxWidth = exportData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
        ws['!cols'] = Array(maxWidth).fill({ wch: 20 });
        
        const fileName = `Orders_${statusFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success(`Exported ${exportData.length} orders to Excel`);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <Loading />;

    return (
        <>
            <div className="flex items-center justify-between mb-5">
                <h1 className="text-2xl text-slate-500">Store <span className="text-slate-800 font-medium">Orders</span></h1>
                {orders.length > 0 && (
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors shadow"
                        title="Export to Excel"
                    >
                        <FileSpreadsheet size={18} />
                        <span className="text-sm">Export to Excel</span>
                    </button>
                )}
            </div>
            {orders.length === 0 ? (
                <p>No orders found</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {statusFilters.map(filter => {
                            const isActive = statusFilter === filter.key;
                            return (
                                <button
                                    key={filter.key}
                                    onClick={() => setStatusFilter(filter.key)}
                                    className={`${isActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'} px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition`}
                                >
                                    <span>{filter.label}</span>
                                    <span className={`${isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700'} px-2 py-0.5 rounded-full border border-slate-200`}>{statusCounts[filter.key] || 0}</span>
                                </button>
                            )
                        })}
                    </div>

                    {filteredOrders.length === 0 ? (
                        <p className="text-sm text-gray-500">No orders in this status.</p>
                    ) : (
                        <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                                    <tr>
                                        {[
                                            "Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"
                                        ].map((heading, i) => (
                                            <th key={i} className="px-4 py-3">{heading}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredOrders.map((order, index) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                            onClick={() => openModal(order)}
                                        >
                                            <td className="pl-6 text-green-600" >
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span>{order.isGuest ? order.guestName : order.user?.name}</span>
                                                    {order.isGuest && (
                                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full w-fit font-semibold">
                                                            Guest
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{currency}{Number(order.total).toFixed(2)}</td>
                                            <td className="px-4 py-3">{order.paymentMethod}</td>
                                            <td className="px-4 py-3">
                                                {order.isCouponUsed ? (
                                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                        {order.coupon?.code}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation() }}>
                                                <select
                                                    value={order.status}
                                                    onChange={e => updateOrderStatus(order.id, e.target.value)}
                                                    className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200"
                                                >
                                                    <option value="ORDER_PLACED">ORDER_PLACED</option>
                                                    <option value="PROCESSING">PROCESSING</option>
                                                    <option value="SHIPPED">SHIPPED</option>
                                                    <option value="DELIVERED">DELIVERED</option>
                                                    <option value="CANCELLED">CANCELLED</option>
                                                    <option value="RETURNED">RETURNED</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(order.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div onClick={closeModal} className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm text-slate-700 text-sm z-50 p-4" >
                    <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Order Details</h2>
                                    <p className="text-blue-100 text-xs">Order ID: {selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadInvoiceHTML(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Download Invoice"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">Download</span>
                                    </button>
                                    <button
                                        onClick={() => printInvoiceHTML(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                                        title="Print Invoice"
                                    >
                                        <Printer size={18} />
                                        <span className="text-sm">Print</span>
                                    </button>
                                    <button
                                        onClick={() => downloadAwbBill({
                                            awbNumber: selectedOrder.trackingId,
                                            orderId: selectedOrder.id,
                                            courier: selectedOrder.courier,
                                            date: selectedOrder.createdAt,
                                            senderName: process.env.NEXT_PUBLIC_INVOICE_COMPANY_NAME || 'Qui',
                                            senderAddress: `${process.env.NEXT_PUBLIC_INVOICE_ADDRESS_LINE1 || ''}, ${process.env.NEXT_PUBLIC_INVOICE_ADDRESS_LINE2 || ''}`,
                                            senderPhone: process.env.NEXT_PUBLIC_INVOICE_CONTACT || '',
                                            receiverName: selectedOrder.address?.name,
                                            receiverAddress: `${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`,
                                            receiverPhone: selectedOrder.address?.phone,
                                            weight: selectedOrder.weight || '',
                                            dimensions: selectedOrder.dimensions || '',
                                            contents: selectedOrder.orderItems?.map(i => i.product?.name).join(', '),
                                            pdfSize: 'a5' // Pass A5 size for AWB
                                        })}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors shadow backdrop-blur-sm"
                                        title="Download AWB Bill"
                                    >
                                        <Download size={18} />
                                        <span className="text-sm">AWB Bill</span>
                                    </button>
                                    <button onClick={closeModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Tracking Details Section */}
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <Truck size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-orange-900">Tracking Information</h3>
                                </div>
                                
                                {selectedOrder.trackingId ? (
                                    <div className="bg-white rounded-lg p-4 mb-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Tracking ID</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.trackingId}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Courier</p>
                                                <p className="font-semibold text-slate-900">{selectedOrder.courier}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Track Order</p>
                                                {selectedOrder.trackingUrl ? (
                                                    <a href={selectedOrder.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                                        View Tracking
                                                    </a>
                                                ) : (
                                                    <p className="text-slate-400">No URL</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Tracking ID *</label>
                                        <input
                                            type="text"
                                            value={trackingData.trackingId}
                                            onChange={e => setTrackingData({...trackingData, trackingId: e.target.value})}
                                            placeholder="Enter tracking ID"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Courier Name *</label>
                                        <input
                                            type="text"
                                            value={trackingData.courier}
                                            onChange={e => setTrackingData({...trackingData, courier: e.target.value})}
                                            placeholder="e.g., FedEx, DHL, UPS"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-1">Tracking URL</label>
                                        <input
                                            type="url"
                                            value={trackingData.trackingUrl}
                                            onChange={e => setTrackingData({...trackingData, trackingUrl: e.target.value})}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={updateTrackingDetails}
                                    className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg transition-colors"
                                >
                                    Update Tracking & Notify Customer
                                </button>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                    Customer Details
                                    {selectedOrder.isGuest && (
                                        <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                            GUEST ORDER
                                        </span>
                                    )}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Name</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest ? selectedOrder.guestName : selectedOrder.user?.name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Email</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest ? selectedOrder.guestEmail : selectedOrder.user?.email}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Phone</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest ? selectedOrder.guestPhone : selectedOrder.address?.phone}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Address</p>
                                        <p className="font-medium text-slate-900">
                                            {selectedOrder.isGuest
                                                ? `${selectedOrder.address?.street || ''}${selectedOrder.address?.street ? ', ' : ''}${[selectedOrder.address?.city, selectedOrder.address?.state, selectedOrder.address?.zip, selectedOrder.address?.country].filter(Boolean).join(', ')}`
                                                : `${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                                    Order Items
                                </h3>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems.map((item, i) => (
                                        <div key={i} className="flex items-center gap-4 border border-slate-200 rounded-xl p-3 bg-white hover:shadow-md transition-shadow">
                                            <img
                                                src={item.product?.images?.[0]}
                                                alt={item.product?.name}
                                                className="w-20 h-20 object-cover rounded-lg"
                                            />
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">{item.product?.name}</p>
                                                <p className="text-sm text-slate-600">Quantity: {item.quantity}</p>
                                                <p className="text-sm font-semibold text-slate-900">{currency}{Number(item.price).toFixed(2)} each</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-slate-900">{currency}{Number(item.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment & Status */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                                    Payment & Status
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Total Amount</p>
                                        <p className="text-xl font-bold text-slate-900">{currency}{Number(selectedOrder.total).toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Method</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.paymentMethod}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Payment Status</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.isPaid ? "✓ Paid" : "Pending"}</p>
                                    </div>
                                    {selectedOrder.isCouponUsed && (
                                        <div>
                                            <p className="text-slate-500">Coupon Used</p>
                                            <p className="font-medium text-green-600">{selectedOrder.coupon.code} ({selectedOrder.coupon.discount}% off)</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-slate-500">Order Status</p>
                                        <p className="font-medium text-slate-900">{selectedOrder.status}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Order Date</p>
                                        <p className="font-medium text-slate-900">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) return;
                                        try {
                                            const token = await getToken();
                                            await axios.delete(`/api/store/orders/${selectedOrder.id}`, {
                                                headers: { Authorization: `Bearer ${token}` }
                                            });
                                            toast.success('Order deleted successfully');
                                            setIsModalOpen(false);
                                            fetchOrders();
                                        } catch (error) {
                                            toast.error(error?.response?.data?.error || 'Failed to delete order');
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow backdrop-blur-sm"
                                    title="Delete Order"
                                >
                                    <X size={18} />
                                    <span className="text-sm">Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
