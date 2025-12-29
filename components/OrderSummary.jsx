import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import AddressModal from './AddressModal';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import {Protect, useAuth, useUser} from '@clerk/nextjs'
import axios from 'axios';
import { clearCart, fetchCart } from '@/lib/features/cart/cartSlice';
import countryList from 'react-select-country-list';
import { countryCodes } from '@/assets/countryCodes';

const OrderSummary = ({ totalPrice, items }) => {

    const {user} = useUser()
    const { getToken, isSignedIn } = useAuth()
    const dispatch = useDispatch()
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED';

    const router = useRouter();

    const addressList = useSelector(state => state.address.list);

    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [coupon, setCoupon] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Guest checkout fields
    const [isGuestCheckout, setIsGuestCheckout] = useState(!isSignedIn);
    const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: countryCodes[0].code, // Set default to first country code
    address: '',
    city: '',
    state: '',
    zip: '00000',
    country: 'UAE'
});

    // Shipping settings (defaults mirror prior behavior)
    const [shipping, setShipping] = useState({
        enabled: true,
        shippingType: 'FLAT_RATE',
        flatRate: 5,
        perItemFee: 2,
        maxItemFee: null,
        freeShippingMin: 499,
        weightUnit: 'kg',
        baseWeight: 1,
        baseWeightFee: 5,
        additionalWeightFee: 2
    });

    // Auto-select first address when addresses are loaded
    useEffect(() => {
        if (isSignedIn && addressList.length > 0 && !selectedAddress) {
            setSelectedAddress(addressList[0]);
        }
    }, [addressList, isSignedIn, selectedAddress]);

    // Auto-select guest checkout if not signed in
    useEffect(() => {
        if (!isSignedIn) {
            setIsGuestCheckout(true);
        }
    }, [isSignedIn]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await axios.get('/api/shipping');
                if (data?.setting) {
                    setShipping({
                        enabled: Boolean(data.setting.enabled),
                        shippingType: data.setting.shippingType || 'FLAT_RATE',
                        flatRate: Number(data.setting.flatRate ?? 5),
                        perItemFee: Number(data.setting.perItemFee ?? 2),
                        maxItemFee: data.setting.maxItemFee ? Number(data.setting.maxItemFee) : null,
                        freeShippingMin: Number(data.setting.freeShippingMin ?? 499),
                        weightUnit: data.setting.weightUnit || 'kg',
                        baseWeight: Number(data.setting.baseWeight ?? 1),
                        baseWeightFee: Number(data.setting.baseWeightFee ?? 5),
                        additionalWeightFee: Number(data.setting.additionalWeightFee ?? 2),
                    });
                }
            } catch (err) {
                // Silent fallback to defaults
            }
        };
        fetchSettings();
    }, []);

    // Calculate shipping fee
    const calculateShipping = () => {
        // Force free shipping across the UI (site-wide free shipping requirement)
        return 0;
    };

    const shippingFee = calculateShipping();

    const handleCouponCode = async (event) => {
        event.preventDefault();
        try {
            if(!user){
                return toast('Please login to proceed')
            }
            const token = await getToken();
            
            // Get store ID from first item (assuming all items are from same store)
            const storeId = items[0]?.storeId;
            const productIds = items.map(item => item.id);
            
            const { data } = await axios.post('/api/coupon', {
                code: couponCodeInput,
                cartTotal: totalPrice,
                productIds: productIds,
                storeId: storeId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setCoupon(data.coupon)
            toast.success('Coupon Applied')
        } catch (error) {
            toast.error(error?.response?.data?.error || error.message)
        }
        
    }

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {
            // Guest checkout validation
            if (!isSignedIn && isGuestCheckout) {
                const missingFields = [];
                if (!guestInfo.name) missingFields.push('Name');
                if (!guestInfo.email) missingFields.push('Email');
                if (!guestInfo.phone) missingFields.push('Phone');
                if (!guestInfo.address) missingFields.push('Address');
                if (!guestInfo.city) missingFields.push('City');
                if (!guestInfo.state) missingFields.push('Emirate');
                if (!guestInfo.country) missingFields.push('Country');
                if (missingFields.length > 0) {
                    return toast.error(`Please fill: ${missingFields.join(', ')}`);
                }
                const orderData = {
                    items,
                    paymentMethod,
                    isGuest: true,
                    guestInfo
                };

                try {
                    const { data } = await axios.post('/api/orders', orderData);
                    // Handle array of orders for guests
                    if (data && ((data.orders && Array.isArray(data.orders) && data.orders.length > 0) || (data.order && data.order.id))) {
                        if (paymentMethod === 'STRIPE') {
                            window.location.href = data.session.url;
                        } else {
                            dispatch(clearCart());
                            toast.success(data.message);
                            // For guests, redirect to first order success (or show all order IDs)
                            const orderId = data.orders ? data.orders[0].id : data.order.id;
                            router.push(`/order-success?orderId=${orderId}`);
                        }
                    } else {
                        router.push('/order-failed');
                    }
                } catch (err) {
                    toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Order Failed. Please try again.');
                }
                return;
            }

            // Regular logged-in user checkout
            if(!user){
                return toast.error('Please login or use guest checkout')
            }
            if(!selectedAddress){
                return toast.error('Please select an address')
            }
            const token = await getToken();

            const orderData = {
                addressId: selectedAddress.id,
                items,
                paymentMethod
            }

            if(coupon){
                orderData.couponCode = coupon.code
            }
           // create order
           const {data} = await axios.post('/api/orders', orderData, {
            headers: { Authorization: `Bearer ${token}` }
           })

           if(data && data.order && data.order.id){
            if(paymentMethod === 'STRIPE'){
                window.location.href = data.session.url;
            }else{
                // Clear cart immediately for COD orders
                dispatch(clearCart())
                toast.success(data.message)
                router.push(`/order-success?orderId=${data.order.id}`)
                // Fetch updated cart from server to sync
                dispatch(fetchCart({getToken}))
            }
           }else{
            router.push('/order-failed');
           }

        } catch (error) {
            router.push('/order-failed');
        } finally {
            setLoading(false);
        }

        
    }

    const allCountries = countryList().getData();

    return (
        <div className='w-full bg-white rounded-lg shadow-sm border border-gray-200 p-5'>
            <h2 className='text-lg font-bold text-gray-900 mb-4 uppercase'>Order Summary</h2>
            
            {/* Quick Checkout/User Toggle */}
            {!isSignedIn && (
                <div className='my-4 pb-4 border-b border-slate-200'>
                    <div className='flex gap-2 items-center'>
                        <input 
                            type="checkbox" 
                            id="guestCheckout" 
                            checked={isGuestCheckout} 
                            onChange={(e) => setIsGuestCheckout(e.target.checked)} 
                            className='accent-orange-500' 
                        />
                        <label htmlFor="guestCheckout" className='cursor-pointer text-slate-600 font-medium'>
                            Quick Checkout
                        </label>
                    </div>
                    {!isGuestCheckout && (
                        <p className='text-xs text-slate-400 mt-2'>
                            Please <a href="/sign-in" className='text-orange-500 hover:underline'>sign in</a> to continue
                        </p>
                    )}
                </div>
            )}

            {/* Quick Checkout Information Form */}
            {!isSignedIn && isGuestCheckout && (
                <div className='my-4 pb-4 border-b border-slate-200'>
                    <p className='text-slate-600 font-medium mb-3'>Quick Checkout Information</p>
                    <div className='space-y-2.5'>
                        <input
                            type="text"
                            placeholder="Full Name *"
                            value={guestInfo.name}
                            onChange={e => setGuestInfo({...guestInfo, name: e.target.value})}
                            className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                        />
                        <input
                            type="email"
                            placeholder="Email Address *"
                            value={guestInfo.email}
                            onChange={e => setGuestInfo({...guestInfo, email: e.target.value})}
                            className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                        />
                        <div className='flex gap-2'>
                            <select
                                value={guestInfo.countryCode}
                                onChange={e => setGuestInfo({...guestInfo, countryCode: e.target.value})}
                                className='border border-slate-300 p-2.5 rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm w-28'
                            >
                                {countryCodes.map(({ code }) => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                            <input
                                type="tel"
                                placeholder="Phone Number *"
                                value={guestInfo.phone}
                                onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})}
                                className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                            />
                        </div>
                        <textarea
                            placeholder="Street Address *"
                            value={guestInfo.address}
                            onChange={e => setGuestInfo({...guestInfo, address: e.target.value})}
                            rows="2"
                            className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm resize-none'
                        />
                        <div className='grid grid-cols-2 gap-2'>
                            <input
                                type="text"
                                placeholder="City *"
                                value={guestInfo.city || ''}
                                onChange={e => setGuestInfo({...guestInfo, city: e.target.value})}
                                className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                            />
                            <select
                                value={guestInfo.state}
                                onChange={e => setGuestInfo({...guestInfo, state: e.target.value})}
                                className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                            >
                                <option value="">Select Emirate *</option>
                                <option value="Abu Dhabi">Abu Dhabi</option>
                                <option value="Dubai">Dubai</option>
                                <option value="Sharjah">Sharjah</option>
                                <option value="Ajman">Ajman</option>
                                <option value="Fujairah">Fujairah</option>
                                <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                                <option value="Umm Al Quwain">Umm Al Quwain</option>
                            </select>
                        </div>
                        <div className='grid grid-cols-2 gap-2'>
                            <input
                                type="hidden"
                                value={guestInfo.zip || '00000'}
                                readOnly
                            />
                            <select
                                value={guestInfo.country}
                                onChange={e => setGuestInfo({...guestInfo, country: e.target.value})}
                                className='border border-slate-300 p-2.5 w-full rounded-lg outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-sm'
                            >
                                <option value="UAE">United Arab Emirates</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className='border-t border-gray-200 pt-4'>
                <p className='text-xs font-semibold text-gray-700 uppercase mb-3'>Payment Method</p>
                <div className='bg-gray-50 border border-gray-200 rounded-lg p-3'>
                    <div className='flex gap-3 items-center'>
                        <input type="radio" id="COD" onChange={() => setPaymentMethod('COD')} checked={paymentMethod === 'COD'} className='accent-orange-500 w-4 h-4' />
                        <label htmlFor="COD" className='cursor-pointer font-medium text-gray-900'>Cash on Delivery</label>
                    </div>
                </div>
            </div>
            
            {/* Address section - only for logged-in users */}
            {isSignedIn && (
            <div className='my-4 pt-4 border-t border-gray-200'>
                <p className='text-xs font-semibold text-gray-700 uppercase mb-3'>Shipping Address</p>
                {
                    selectedAddress ? (
                        <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
                            <div className='flex items-start justify-between gap-2'>
                                <div className='flex-1'>
                                    <p className='font-semibold text-gray-900 text-sm'>{selectedAddress.name}</p>
                                    <p className='text-xs text-gray-600 mt-1'>{selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}</p>
                                    <p className='text-xs text-gray-600'>{selectedAddress.phone}</p>
                                </div>
                                <button onClick={() => setSelectedAddress(null)} className='text-orange-600 hover:text-orange-700' title='Change Address'>
                                    <SquarePenIcon size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {
                                addressList.length > 0 && (
                                    <select className='border border-gray-300 p-2.5 w-full mb-2 outline-none rounded-lg focus:border-orange-500 focus:ring-1 focus:ring-orange-500' onChange={(e) => setSelectedAddress(addressList[e.target.value])} >
                                        <option value="">Select Address</option>
                                        {
                                            addressList.map((address, index) => (
                                                <option key={index} value={index}>{address.name}, {address.city}, {address.state}</option>
                                            ))
                                        }
                                    </select>
                                )
                            }
                            <button className='flex items-center gap-1.5 text-orange-600 hover:text-orange-700 text-sm font-semibold' onClick={() => setShowAddressModal(true)} >
                                <PlusIcon size={16} /> Add New Address
                            </button>
                        </div>
                    )
                }
            </div>
            )}
            <div className='my-4 py-4 border-y border-gray-200'>
                <div className='space-y-3'>
                    <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Subtotal</span>
                        <span className='font-semibold text-gray-900'>{currency} {totalPrice.toLocaleString()}</span>
                    </div>
                    <div className='flex justify-between text-sm'>
                        <span className='text-gray-600'>Shipping</span>
                        <span className='font-semibold'>
                            <Protect plan={'plus'} fallback={<span className='text-gray-900'>{currency}{shippingFee.toLocaleString()}</span>}>
                                <span className='text-green-600'>Free</span>
                            </Protect>
                        </span>
                    </div>
                    {coupon && (
                        <div className='flex justify-between text-sm'>
                            <span className='text-gray-600'>Coupon ({coupon.discountType === 'percentage' ? `${coupon.discount}%` : `${currency}${coupon.discount}`})</span>
                            <span className='font-semibold text-green-600'>-{currency}{coupon.discountType === 'percentage' ? (coupon.discount / 100 * totalPrice).toFixed(2) : Math.min(coupon.discount, totalPrice).toFixed(2)}</span>
                        </div>
                    )}
                </div>
                <div className='flex justify-between text-sm font-semibold mt-4'>
                    <span className='text-gray-700'>Total</span>
                    <span className='text-gray-900'>
                        {currency} {
                            (
                                Number(totalPrice) + Number(shippingFee)
                                - (coupon ? (coupon.discountType === 'percentage' ? (coupon.discount / 100 * totalPrice) : Math.min(coupon.discount, totalPrice)) : 0)
                            ).toFixed(2)
                        }
                    </span>
                </div>
            </div>
            
            <button 
                onClick={e => toast.promise(handlePlaceOrder(e), { loading: 'Placing Order...' })}
                disabled={loading || (!isSignedIn && !isGuestCheckout)}
                className={`w-full py-3.5 rounded-lg font-bold text-base transition-colors shadow-md hover:shadow-lg uppercase ${
                    loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : (!isSignedIn && !isGuestCheckout 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-orange-500 text-white hover:bg-orange-600')
                }`}
            >
                {loading ? 'Placing Order...' : (!isSignedIn && !isGuestCheckout ? 'Sign In or Use Guest Checkout' : 'Proceed to Checkout')}
            </button>

            {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}

        </div>
    )
}

export default OrderSummary