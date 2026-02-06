'use client'

import { useState, useEffect } from 'react'
import { X, Gift, Copy, Check } from 'lucide-react'
import { useAuth, useUser } from '@clerk/nextjs'
import axios from 'axios'

const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isFirstOrder, setIsFirstOrder] = useState(false)
  const [couponCode, setCouponCode] = useState('WELCOME15')
  const [discountPercentage, setDiscountPercentage] = useState(15)
  const [cooldownHours, setCooldownHours] = useState(6)
  const [modalEnabled, setModalEnabled] = useState(true)
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  // Fetch settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axios.get('/api/admin/welcome-settings')
        if (data.settings) {
          setCouponCode(data.settings.couponCode || 'WELCOME15')
          setDiscountPercentage(data.settings.discountPercentage || 15)
          setCooldownHours(data.settings.cooldownHours || 6)
          setModalEnabled(data.settings.enabled !== false)
        }
      } catch (error) {
        // Use defaults if fetch fails
        console.error('Error fetching settings:', error)
      }
    }
    fetchSettings()
  }, [])

  useEffect(() => {
    const checkAndShowModal = async () => {
      if (!modalEnabled) return

      // Check if modal was shown in last X hours (from settings)
      const lastShown = localStorage.getItem('welcomeModalLastShown')
      const cooldownInMs = cooldownHours * 60 * 60 * 1000
      const now = Date.now()

      if (lastShown && (now - parseInt(lastShown)) < cooldownInMs) {
        return // Don't show if shown in last X hours
      }

      // If user is signed in, check if they have any orders
      if (isSignedIn) {
        try {
          const token = await getToken()
          const { data } = await axios.get('/api/orders', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (data.orders && data.orders.length === 0) {
            setIsFirstOrder(true)
            setIsOpen(true)
            localStorage.setItem('welcomeModalLastShown', now.toString())
          }
        } catch (error) {
          console.error('Error checking orders:', error)
        }
      } else {
        // For guest users, show welcome modal
        setIsOpen(true)
        localStorage.setItem('welcomeModalLastShown', now.toString())
      }
    }

    checkAndShowModal()
  }, [isSignedIn, getToken, modalEnabled, cooldownHours])

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative animate-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-t-2xl p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <Gift size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isSignedIn ? `Welcome, ${user?.firstName || 'Friend'}!` : 'Welcome to Our Store!'}
          </h2>
          <p className="text-orange-100 text-sm">
            {isSignedIn && isFirstOrder
              ? 'Special offer for your first order'
              : 'Exclusive deal just for you'}
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {isSignedIn && isFirstOrder ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-block bg-orange-50 rounded-full px-4 py-2 mb-3">
                  <span className="text-3xl font-bold text-orange-600">{discountPercentage}% OFF</span>
                </div>
                <p className="text-gray-600 text-sm">
                  Use this exclusive code on your first purchase
                </p>
              </div>

              {/* Coupon Code Box */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 border-dashed rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Your Discount Code</p>
                    <p className="text-2xl font-bold text-orange-600 tracking-wider">
                      {couponCode}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check size={18} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Valid only for first-time orders</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Can be combined with selected products</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Use code at checkout</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-700 text-lg mb-2">🎉 Great Deals Await!</p>
                <p className="text-gray-600 text-sm">
                  Sign up to unlock exclusive discounts and offers
                </p>
              </div>

              <a
                href="/sign-up"
                className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3 rounded-lg font-semibold transition-colors mb-3"
              >
                Sign Up Now
              </a>

              <a
                href="/sign-in"
                className="block w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 text-center py-3 rounded-lg font-semibold transition-colors"
              >
                Already have an account? Sign In
              </a>
            </>
          )}

          <button
            onClick={handleClose}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal
