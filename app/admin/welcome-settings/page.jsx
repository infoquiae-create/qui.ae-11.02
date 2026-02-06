'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import { Save, Gift, Settings } from 'lucide-react'

export default function WelcomeSettingsPage() {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState({
    couponCode: 'WELCOME15',
    discountPercentage: 15,
    enabled: true,
    cooldownHours: 6
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get('/api/admin/welcome-settings', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.settings) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      await axios.post('/api/admin/welcome-settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('Settings saved successfully!')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-orange-100 p-3 rounded-xl">
              <Gift className="text-orange-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Welcome Modal Settings</h1>
              <p className="text-slate-600">Configure first-time visitor discount settings</p>
            </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="text-slate-600" size={24} />
            <h2 className="text-xl font-semibold text-slate-900">Modal Configuration</h2>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <label className="text-sm font-semibold text-slate-900 block mb-1">
                  Enable Welcome Modal
                </label>
                <p className="text-xs text-slate-600">
                  Show welcome popup to new visitors
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Coupon Code */}
            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-2">
                Discount Coupon Code
              </label>
              <input
                type="text"
                value={settings.couponCode}
                onChange={(e) => setSettings({ ...settings, couponCode: e.target.value.toUpperCase() })}
                placeholder="WELCOME15"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-lg"
              />
              <p className="text-xs text-slate-500 mt-2">
                This code will be shown to first-time registered users
              </p>
            </div>

            {/* Discount Percentage */}
            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-2">
                Discount Percentage
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settings.discountPercentage}
                  onChange={(e) => setSettings({ ...settings, discountPercentage: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 font-semibold">
                  %
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Discount applied on first order (1-100%)
              </p>
            </div>

            {/* Cooldown Hours */}
            <div>
              <label className="text-sm font-semibold text-slate-900 block mb-2">
                Cooldown Period (Hours)
              </label>
              <input
                type="number"
                value={settings.cooldownHours}
                onChange={(e) => setSettings({ ...settings, cooldownHours: parseInt(e.target.value) || 6 })}
                min="1"
                max="168"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
              />
              <p className="text-xs text-slate-500 mt-2">
                Time before modal can show again (1-168 hours)
              </p>
            </div>

            {/* Preview Box */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-xl p-6">
              <p className="text-xs text-slate-600 mb-2">Preview:</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Coupon Code</p>
                  <p className="text-3xl font-bold text-orange-600 tracking-wider">
                    {settings.couponCode || 'WELCOME15'}
                  </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg">
                  <p className="text-sm text-slate-600">Discount</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {settings.discountPercentage}% OFF
                  </p>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Important Notes:</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Modal shows only on the home page</li>
                <li>• For registered users: Shows only if they have no previous orders</li>
                <li>• For guests: Shows welcome message with sign-up prompt</li>
                <li>• Modal respects the cooldown period set above</li>
                <li>• Make sure to create the coupon code in the Coupons section</li>
              </ul>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/admin/coupons"
              className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all"
            >
              <div className="bg-orange-100 p-2 rounded-lg">
                <Gift className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Manage Coupons</p>
                <p className="text-xs text-slate-600">Create or edit discount codes</p>
              </div>
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('welcomeModalLastShown')
                toast.success('Modal cooldown reset! Refresh to test.')
              }}
              className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="bg-blue-100 p-2 rounded-lg">
                <Settings className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Reset Cooldown</p>
                <p className="text-xs text-slate-600">Test modal immediately</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
