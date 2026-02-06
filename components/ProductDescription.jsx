'use client'
import { ArrowRight, StarIcon, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import ReviewForm from "./ReviewForm"
import axios from "axios"
import ProductCard from "./ProductCard"
import { useSelector } from "react-redux"
import { useUser } from "@clerk/nextjs"
import toast from "react-hot-toast"

// Updated design - Noon.com style v2
const ProductDescription = ({ product }) => {

    const { user } = useUser()
    const [reviews, setReviews] = useState([])
    const [loadingReviews, setLoadingReviews] = useState(false)
    const [suggestedProducts, setSuggestedProducts] = useState([])
    const [deletingReviewId, setDeletingReviewId] = useState(null)
    const allProducts = useSelector((state) => state.product.list || [])

    // Calculate rating distribution
    const ratingCounts = [0, 0, 0, 0, 0]
    reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
            ratingCounts[review.rating - 1]++
        }
    })

    const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0

    useEffect(() => {
        fetchReviews()
        fetchSuggestedProducts()
    }, [product.id, allProducts])

    const fetchSuggestedProducts = () => {
        // Filter products by same category or tags, exclude current product
        const related = allProducts.filter(p => {
            if (p.id === product.id) return false
            
            // Match by category
            if (p.category === product.category) return true
            
            // Match by tags if they exist
            if (product.tags && p.tags) {
                const productTags = Array.isArray(product.tags) ? product.tags : []
                const pTags = Array.isArray(p.tags) ? p.tags : []
                return productTags.some(tag => pTags.includes(tag))
            }
            
            return false
        })
        
        // Shuffle and take first 8 products
        const shuffled = related.sort(() => 0.5 - Math.random())
        setSuggestedProducts(shuffled.slice(0, 8))
    }

    const fetchReviews = async () => {
        try {
            setLoadingReviews(true)
            const { data } = await axios.get(`/api/review?productId=${product.id}`)
            setReviews(data.reviews)
        } catch (error) {
            console.error('Failed to fetch reviews:', error)
        } finally {
            setLoadingReviews(false)
        }
    }

    const handleReviewAdded = (newReview) => {
        fetchReviews()
    }

    const handleDeleteReview = async (reviewId) => {
        if (!confirm('Are you sure you want to delete this review?')) {
            return
        }

        try {
            setDeletingReviewId(reviewId)
            await axios.delete(`/api/review?reviewId=${reviewId}`)
            toast.success('Review deleted successfully')
            fetchReviews()
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Failed to delete review')
        } finally {
            setDeletingReviewId(null)
        }
    }

    return (
        <div className="my-8">

            {/* Product Description Section */}
            <div className="bg-white border border-gray-200 mb-6">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">Product Description</h2>
                </div>
                <div className="p-6">
                    <div 
                        className="prose prose-slate max-w-none 
                        prose-headings:text-gray-900 prose-headings:font-bold prose-headings:mb-3
                        prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                        prose-ul:text-gray-700 prose-ul:mb-4 prose-li:text-gray-700 prose-li:mb-2
                        prose-strong:text-gray-900 prose-strong:font-semibold
                        prose-img:rounded-lg prose-img:shadow-sm
                        prose-table:border-collapse prose-table:w-full prose-table:my-4
                        prose-th:text-left prose-th:p-3 prose-th:bg-gray-50 prose-th:font-semibold prose-th:border prose-th:border-gray-200
                        prose-td:p-3 prose-td:border prose-td:border-gray-200"
                        dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white border border-gray-200">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">Reviews</h2>
                </div>
                <div className="p-8">
                    {/* Rating Overview - Horizontal Layout */}
                    <div className="mb-10">
                        <div className="flex items-start gap-8 pb-8 border-b border-gray-200">
                            {/* Left: Large Rating */}
                            <div className="flex flex-col items-center min-w-[120px]">
                                <div className="text-6xl font-bold text-gray-900 mb-2">{averageRating}</div>
                                <div className="flex mb-2">
                                    {Array(5).fill('').map((_, i) => (
                                        <StarIcon
                                            key={i}
                                            size={20}
                                            fill={i < Math.round(averageRating) ? "#FFA500" : "#D1D5DB"}
                                            className="text-transparent"
                                        />
                                    ))}
                                </div>
                                <div className="text-sm text-gray-500">{reviews.length} Ratings</div>
                            </div>

                            {/* Right: Rating Distribution Bars */}
                            <div className="flex-1 space-y-2">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = ratingCounts[star - 1]
                                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                                    return (
                                        <div key={star} className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 min-w-[45px]">
                                                <span className="text-sm font-medium text-gray-700">{star}</span>
                                                <StarIcon size={14} fill="#FFA500" className="text-transparent" />
                                            </div>
                                            <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden max-w-md">
                                                <div 
                                                    className="bg-gradient-to-r from-orange-400 to-red-500 h-full transition-all duration-300"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="min-w-[25px] text-right text-sm text-gray-600">{count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Add Review Section */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Add Review</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            You can add your review by clicking the star rating below:
                        </p>
                        <ReviewForm productId={product.id} onReviewAdded={handleReviewAdded} />
                    </div>

                    {/* Reviews List */}
                    {loadingReviews ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {reviews.map((item) => (
                                <div key={item.id} className="pb-6 border-b border-gray-100 last:border-0">
                                    <div className="flex gap-4">
                                        {/* User Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                                                {item.user.name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        </div>
                                        
                                        {/* Review Content */}
                                        <div className="flex-1">
                                            {/* User Info & Rating */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.user.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {new Date(item.createdAt).toLocaleDateString('en-US', {
                                                            day: 'numeric',
                                                            month: 'long',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-0.5">
                                                        {Array(5).fill('').map((_, index) => (
                                                            <StarIcon 
                                                                key={index} 
                                                                size={14} 
                                                                className='text-transparent' 
                                                                fill={item.rating >= index + 1 ? "#FFA500" : "#D1D5DB"} 
                                                            />
                                                        ))}
                                                    </div>
                                                    {user && item.user.id === user.id && (
                                                        <button
                                                            onClick={() => handleDeleteReview(item.id)}
                                                            disabled={deletingReviewId === item.id}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Delete this review"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Review Text */}
                                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{item.review}</p>
                                            
                                            {/* Review Images */}
                                            {item.images && item.images.length > 0 && (
                                                <div className="flex gap-2 flex-wrap mb-3">
                                                    {item.images.map((img, idx) => (
                                                        <div key={idx} className="relative group">
                                                            <Image
                                                                src={img}
                                                                alt={`Review image ${idx + 1}`}
                                                                width={80}
                                                                height={80}
                                                                className="rounded-lg object-cover border border-gray-200 hover:border-orange-400 transition-colors cursor-pointer"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Country Flag */}
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>🇦🇪</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Suggested Products Section */}
            {suggestedProducts.length > 0 && (
                <div className="bg-white border border-gray-200 mt-6">
                    <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">You May Also Like</h2>
                        {product.category && (
                            <Link 
                                href={`/shop?category=${product.category}`}
                                className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                            >
                                View All <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {suggestedProducts.map((suggestedProduct) => (
                                <ProductCard key={suggestedProduct.id} product={suggestedProduct} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
           
        </div>
    )
}

export default ProductDescription