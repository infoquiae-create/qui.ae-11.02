'use client'

import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { FaStar } from 'react-icons/fa'
import { ShoppingCartIcon } from 'lucide-react'
import { addToCart, uploadCart } from '@/lib/features/cart/cartSlice'
import { fetchProducts } from '@/lib/features/product/productSlice'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import Title from './Title'

// Helper to get product image
const getImageSrc = (product, index = 0) => {
  if (product.images && Array.isArray(product.images) && product.images.length > index) {
    if (product.images[index]?.url) return product.images[index].url
    if (product.images[index]?.src) return product.images[index].src
    if (typeof product.images[index] === 'string') return product.images[index]
  }
  return '/placeholder.png'
}

// Product Card Component
const ProductCard = ({ product, index }) => {
  const [hovered, setHovered] = useState(false)
  const [secondaryLoaded, setSecondaryLoaded] = useState(false)
  const dispatch = useDispatch()
  const { getToken } = useAuth()
  const cartItems = useSelector(state => state.cart.cartItems)
  const itemQuantity = cartItems[product.id] || 0
  
  // Only prioritize first 5 products
  const shouldPrioritize = index < 5

  const primaryImage = getImageSrc(product, 0)
  const secondaryImage = getImageSrc(product, 1)
  
  // Only has secondary if it exists, is not placeholder, and is different from primary
  const hasSecondary = secondaryImage !== '/placeholder.png' && 
                       secondaryImage !== primaryImage &&
                       product.images?.length > 1
  
  const discount =
    product.mrp && product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0
  // Support both array and number for rating
  // Use backend response fields
  const ratingValue = Math.round(product.averageRating || 0);
  const reviewCount = product.ratingCount || 0;

  // Split price into integer and decimal
  const [intPrice, decPrice] = (product.price?.toFixed(2) || '0.00').split('.')
  const [intOrig, decOrig] = product.mrp?.toFixed(2).split('.') || ['0', '00']

  // Truncate product name to 25 characters
  const productName = (product.name || product.title || 'Untitled Product').length > 25
    ? (product.name || product.title || 'Untitled Product').slice(0, 25) + '...'
    : (product.name || product.title || 'Untitled Product')

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(addToCart({ productId: product.id }))
    dispatch(uploadCart({ getToken }))
    toast.success('Added to cart')
  }

  return (
    <Link
      href={`/product/${product.slug || product.id || ''}`}
      className={`group bg-white rounded-2xl border border-gray-200 shadow-sm ${hasSecondary ? 'hover:shadow-lg' : ''} transition-all duration-300 flex flex-col w-full h-full relative`}
      onMouseEnter={hasSecondary ? () => setHovered(true) : null}
      onMouseLeave={hasSecondary ? () => setHovered(false) : null}
    >
      {/* Image Container */}
      <div className="relative w-full h-56 overflow-hidden bg-gray-50" style={{ borderRadius: '10px 10px 0 0' }}>
        {product.fastDelivery && (
          <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10">
            Fast Delivery
          </span>
        )}
        <Image
          src={primaryImage}
          alt={productName}
          fill
          style={{ objectFit: 'cover' }}
          className={`w-full h-full object-cover ${hasSecondary ? 'transition-opacity duration-500' : ''} ${
            hasSecondary && hovered ? 'opacity-0' : 'opacity-100'
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1300px) 50vw, 25vw"
          priority={shouldPrioritize}
          loading={shouldPrioritize ? 'eager' : 'lazy'}
          quality={75}
          onError={(e) => { e.currentTarget.src = '/placeholder.png' }}
        />

        {hasSecondary && (hovered || secondaryLoaded) && (
          <Image
            src={secondaryImage}
            alt={productName}
            fill
            style={{ objectFit: 'cover' }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1300px) 50vw, 25vw"
            loading="lazy"
            quality={75}
            onError={(e) => { e.currentTarget.src = '/placeholder.png' }}
            onLoad={() => setSecondaryLoaded(true)}
          />
        )}
        
        {/* Discount Badge */}
        {discount > 0 && (
          <span className={`absolute top-2 right-2 ${discount >= 50 ? 'bg-green-500' : 'bg-orange-500'} text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10`}>
            {discount}% OFF
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="mt-2 flex flex-col flex-grow justify-between p-3">
        {/* Title + Rating */}
        <div>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
            {productName}
          </h3>
          <div className="flex items-center mt-1">
            {reviewCount > 0 ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <FaStar
                    key={i}
                    size={12}
                    className={i < ratingValue ? 'text-yellow-400' : 'text-gray-300'}
                  />
                ))}
                <span className="text-gray-500 text-xs ml-1">({reviewCount})</span>
              </>
            ) : (
              <span className="text-xs text-gray-400 ml-1">No reviews</span>
            )}
          </div>
        </div>

        {/* Price + Discount Badge */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Current Price */}
            <p className="text-black font-bold text-base flex items-baseline">
              <span className="mr-1">AED</span>
              <span>{intPrice}</span>
              <span className="text-xs align-top ml-0.5">.{decPrice}</span>
            </p>

            {/* Original Price */}
            {product.mrp && product.mrp > product.price && (
              <p className="text-gray-400 text-xs line-through flex items-baseline">
                <span className="mr-0.5">AED</span>
                <span>{intOrig}</span>
                <span className="text-[10px] align-top ml-0.5">.{decOrig}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cart Button with Badge - Bottom Right */}
      <button 
        onClick={handleAddToCart}
        className='absolute bottom-4 right-4 w-10 h-10 bg-slate-700 hover:bg-slate-900 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer z-10'
      >
        <ShoppingCartIcon className='text-white' size={18} />
        {itemQuantity > 0 && (
          <span className='absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md'>
            {itemQuantity}
          </span>
        )}
      </button>
    </Link>
  )
}

// BestSelling Component
const BestSelling = () => {
  const displayQuantity = 10
  const products = useSelector((state) => state.product.list || [])
  const [curated, setCurated] = useState([])
  const dispatch = useDispatch()

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchProducts({ limit: displayQuantity }))
    }
  }, [products.length, dispatch])

  // useEffect(() => {
  //   const load = async () => {
  //     try {
  //       const { data } = await axios.get('/api/home-selection?section=limited_offers')
  //       if (Array.isArray(data.products)) setCurated(data.products)
  //     } catch (e) {
  //     }
  //   }
  //   load()
  // }, [])

  const baseSorted = useMemo(() =>
    products
      .slice()
      .sort((a, b) => (b.rating?.length || b.ratingCount || 0) - (a.rating?.length || a.ratingCount || 0))
      .slice(0, displayQuantity)
  , [products, displayQuantity])

  const shown = (curated.length ? curated : baseSorted).slice(0, displayQuantity)
  const isLoading = products.length === 0;

  return (
    <div className="px-4 my-16 max-w-7xl mx-auto">
      <Title
        title="Craziest sale of the year!"
        description="Grab the best deals before they're gone!"
        visibleButton={false}
      />

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-6">
        {isLoading
          ? Array(displayQuantity).fill(0).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm animate-pulse flex flex-col w-full h-full relative">
                <div className="relative w-full h-56 overflow-hidden bg-gray-100 rounded-t-2xl" />
                <div className="mt-2 flex flex-col flex-grow justify-between p-3">
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                    <div className="flex items-center mt-1 gap-1">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-3 w-3 bg-gray-200 rounded-full" />
                      ))}
                      <div className="h-3 w-8 bg-gray-100 rounded ml-1" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-12 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 w-10 h-10 bg-gray-200 rounded-full" />
              </div>
            ))
          : shown.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
      </div>
    </div>
  )
}

export default BestSelling
