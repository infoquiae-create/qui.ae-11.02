'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from "react"
import { toast } from "react-hot-toast"
import Image from "next/image"
import Loading from "@/components/Loading"
import { useAuth, useUser } from "@clerk/nextjs"
import axios from "axios"
import { StarIcon, Trash2 } from "lucide-react"


export default function StoreReviews() {
    const { getToken } = useAuth()
    const { user } = useUser()

    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState([])
    const [showAddModal, setShowAddModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [deletingReviewId, setDeletingReviewId] = useState(null)
    const [formData, setFormData] = useState({
        customerName: '',
        customerEmail: '',
        rating: 5,
        review: '',
        images: []
    })

    const fetchReviews = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get('/api/store/reviews', {
                headers: { Authorization: `Bearer ${token}` }
            })
            setProducts(data.products)
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        setLoading(false)
    }

    const handleApproval = async (reviewId, approved) => {
        try {
            const token = await getToken()
            await axios.post('/api/store/reviews/approve', 
                { reviewId, approved },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            toast.success(approved ? 'Review approved' : 'Review rejected')
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    const handleDeleteReview = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) {
            return
        }

        try {
            setDeletingReviewId(reviewId)
            const token = await getToken()
            await axios.delete(`/api/store/reviews?reviewId=${reviewId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            toast.success('Review deleted successfully')
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        } finally {
            setDeletingReviewId(null)
        }
    }

    const handleSubmitReview = async (e) => {
        e.preventDefault()
        
        try {
            const token = await getToken()
            const form = new FormData()
            form.append('productId', selectedProduct.id)
            form.append('rating', formData.rating)
            form.append('review', formData.review)
            form.append('customerName', formData.customerName)
            form.append('customerEmail', formData.customerEmail)
            
            formData.images.forEach((img) => {
                form.append('images', img)
            })

            await axios.post('/api/store/reviews', form, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success('Review added successfully')
            setShowAddModal(false)
            setFormData({ customerName: '', customerEmail: '', rating: 5, review: '', images: [] })
            setSelectedProduct(null)
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    useEffect(() => {
        if (user) {
            fetchReviews()
        }
    }, [user])

    if (loading) return <Loading />

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">
                Product <span className="text-slate-800 font-medium">Reviews</span>
            </h1>

            <div className="space-y-6">
                {products.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 bg-white shadow">
                        <div className="flex items-center gap-4 mb-4">
                            <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={60}
                                height={60}
                                className="rounded object-cover"
                            />
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <p className="text-sm text-slate-600">
                                    {product.rating.length} review{product.rating.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProduct(product)
                                    setShowAddModal(true)
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Add Review
                            </button>
                        </div>

                        {/* Reviews List */}
                        <div className="space-y-3 mt-4">
                            {product.rating.map((rev) => (
                                <div key={rev.id} className="border-t pt-3">
                                    <div className="flex items-start gap-3">
                                        <Image
                                            src={rev.user.image}
                                            alt={rev.user.name}
                                            width={40}
                                            height={40}
                                            className="rounded-full"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium">{rev.user.name}</span>
                                                <div className="flex">
                                                    {Array(5).fill('').map((_, i) => (
                                                        <StarIcon
                                                            key={i}
                                                            size={14}
                                                            fill={rev.rating >= i + 1 ? "#FFA500" : "#D1D5DB"}
                                                            className="text-transparent"
                                                        />
                                                    ))}
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${rev.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {rev.approved ? 'Approved' : 'Pending'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">{rev.review}</p>
                                            {rev.images && rev.images.length > 0 && (
                                                <div className="flex gap-2 mt-2">
                                                    {rev.images.map((img, idx) => (
                                                        <Image
                                                            key={idx}
                                                            src={img}
                                                            alt="Review image"
                                                            width={80}
                                                            height={80}
                                                            className="rounded object-cover"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <p className="text-xs text-slate-400">
                                                    {new Date(rev.createdAt).toLocaleDateString()}
                                                </p>
                                                {!rev.approved && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApproval(rev.id, true)}
                                                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproval(rev.id, false)}
                                                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteReview(rev.id)}
                                                    disabled={deletingReviewId === rev.id}
                                                    className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Delete this review"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {product.rating.length === 0 && (
                                <p className="text-slate-400 text-sm">No reviews yet</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Review Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form
                        onSubmit={handleSubmitReview}
                        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <h2 className="text-xl font-semibold mb-4">
                            Add Review for: {selectedProduct?.name}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.customerName}
                                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Customer Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.customerEmail}
                                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Rating *</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, rating: star })}
                                            className="text-3xl"
                                        >
                                            <StarIcon
                                                size={32}
                                                fill={formData.rating >= star ? "#FFA500" : "#D1D5DB"}
                                                className="text-transparent cursor-pointer hover:scale-110 transition"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Review *</label>
                                <textarea
                                    required
                                    value={formData.review}
                                    onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                    rows={4}
                                    className="w-full border rounded px-3 py-2"
                                    placeholder="Write your review..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Images (Optional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => setFormData({ ...formData, images: Array.from(e.target.files) })}
                                    className="w-full border rounded px-3 py-2"
                                />
                                <p className="text-xs text-slate-500 mt-1">You can upload multiple images</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                                Add Review
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddModal(false)
                                    setSelectedProduct(null)
                                    setFormData({ customerName: '', customerEmail: '', rating: 5, review: '', images: [] })
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
