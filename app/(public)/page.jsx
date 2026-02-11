'use client'
import BestSelling from "@/components/BestSelling";
import Hero from "@/components/Hero";
import Newsletter from "@/components/Newsletter";
import OurSpecs from "@/components/OurSpec";
import LatestProducts from "@/components/LatestProducts";
import BannerSlider from "@/components/BannerSlider";
// import WelcomeModal from "@/components/WelcomeModal";

import HomeDealsSection from "@/components/HomeDealsSection";
import BrandDirectory from "@/components/BrandDirectory";
import ProductSection from "@/components/ProductSection";
import { useSelector } from "react-redux";
import { useMemo, useEffect, useState } from "react";
import axios from "axios";

export default function Home() {
    const products = useSelector(state => state.product.list);
    const [adminSections, setAdminSections] = useState([]);
    const [gridSections, setGridSections] = useState([]);

    useEffect(() => {
        fetchAdminSections();
        // Fetch grid config on mount
        axios.get('/api/admin/grid-products').then(res => {
            setGridSections(Array.isArray(res.data.sections) ? res.data.sections : []);
        });
    }, []);

    const fetchAdminSections = async () => {
        try {
            const { data } = await axios.get('/api/admin/home-sections');
            setAdminSections(data.sections || []);
        } catch (error) {
            console.error('Error fetching admin sections:', error);
        }
    };

    // Create sections from admin data
    const curatedSections = useMemo(() => {
        return adminSections.map(section => {
            // Get products by IDs if specified
            let sectionProducts = section.productIds?.length > 0
                ? products.filter(p => section.productIds.includes(p.id))
                : products;

            // Filter by category if specified
            if (section.category) {
                sectionProducts = sectionProducts.filter(p => p.category === section.category);
            }

            return {
                title: section.section,
                products: sectionProducts,
                viewAllLink: section.category ? `/shop?category=${section.category}` : '/shop'
            };
        });
    }, [adminSections, products]);

    // Fallback: Create sections based on categories if no admin sections
    const categorySections = useMemo(() => {
        if (adminSections.length > 0) return [];
        
        const categories = [...new Set(products.map(p => p.category))];
        
        return categories.slice(0, 4).map(category => ({
            title: `Top Deals on ${category}`,
            products: products.filter(p => p.category === category),
            viewAllLink: `/shop?category=${category}`
        }));
    }, [products, adminSections]);

    const sections = curatedSections.length > 0 ? curatedSections : categorySections;

    // Prepare grid sections with product details
    const gridSectionsWithProducts = gridSections.map(section => ({
        ...section,
        products: (section.productIds || []).map(pid => products.find(p => p.id === pid)).filter(Boolean)
    }));
    // Only show grid if at least one section has a title and products
    const showGrid = gridSectionsWithProducts.some(s => s.title && s.products && s.products.length > 0);

    return (
        <div>
            {/* <WelcomeModal /> */}
            <Hero />
            <LatestProducts />
            {/* <BestSelling /> */}
            <BannerSlider/>
            {showGrid && <HomeDealsSection sections={gridSectionsWithProducts} />}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* First row: first two sections side by side */}
                {sections.length >= 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* <ProductSection
                            key={0}
                            title={sections[0].title}
                            products={sections[0].products}
                            viewAllLink={sections[0].viewAllLink}
                        />
                        <ProductSection
                            key={1}
                            title={sections[1].title}
                            products={sections[1].products}
                            viewAllLink={sections[1].viewAllLink}
                        /> */}
                    </div>
                )}
                {/* Additional sections below */}
                {sections.slice(2).map((section, index) => (
                    <ProductSection
                        key={index + 2}
                        title={section.title}
                        products={section.products}
                        viewAllLink={section.viewAllLink}
                    />
                ))}
            </div>
            {/* <OurSpecs /> */}
            {/* <Newsletter /> */}
            {/* <BrandDirectory/> */}
        </div>
    );
}
