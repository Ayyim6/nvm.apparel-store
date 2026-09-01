const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
    setup() {
        const currentPage = ref('home');
        const cart = ref(JSON.parse(localStorage.getItem('nvm_cart')) || []);
        const showToast = ref(false);
        const toastMessage = ref('');
        const isCartOpen = ref(false);
        const isImageModalOpen = ref(false);
        const selectedImage = ref('');

        // NEW: Slideshow Hero Images (Minimum 3 Gambar)
        const heroImages = ref([
            'headerbg-2.png',
            'https://images.unsplash.com/photo-1523398002811-999aa8d9512e?w=1600&q=80',
            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1600&q=80'
        ]);
        const currentHeroIndex = ref(0);

        // NEW: Auto Invoice States
        const showInvoice = ref(false);
        const currentOrderId = ref('');
        const currentDate = ref('');

        const defaultProducts = [
            { id: 1, name: 'Pro Home Jersey', price: 120, img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&q=80', tempSize: '' },
            { id: 2, name: 'Away Kit Edition', price: 120, img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&q=80', tempSize: '' },
            { id: 3, name: 'Retro Classic 90s', price: 150, img: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=500&q=80', tempSize: '' },
            { id: 4, name: 'Training Jacket', price: 180, img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', tempSize: '' }
        ];

        const allProducts = ref(JSON.parse(localStorage.getItem('nvm_database_products')) || defaultProducts);
        allProducts.value.forEach(p => { if(!p.tempSize) p.tempSize = ''; });

        const cartCount = computed(() => cart.value.length);
        const cartTotal = computed(() => cart.value.reduce((total, item) => total + item.price, 0));

        const navigate = async (page) => {
            currentPage.value = page;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            await nextTick(); 
            AOS.refreshHard();
        };

        const openImage = (imgUrl) => {
            selectedImage.value = imgUrl;
            isImageModalOpen.value = true;
        };
        const closeImage = () => { isImageModalOpen.value = false; };

        const addToCart = (product) => {
            if(!product.tempSize) {
                alert("Sila pilih saiz terlebih dahulu!");
                return;
            }
            const itemToCart = { ...product, cartId: Date.now(), selectedSize: product.tempSize };
            cart.value.push(itemToCart);
            localStorage.setItem('nvm_cart', JSON.stringify(cart.value));
            toastMessage.value = `${product.name} ditambah!`;
            showToast.value = true;
            isCartOpen.value = true;
            setTimeout(() => { showToast.value = false; }, 2000);
        };

        const removeFromCart = (index) => {
            cart.value.splice(index, 1);
            localStorage.setItem('nvm_cart', JSON.stringify(cart.value));
        };

        // NEW: Buka Invoice Modal
        const openInvoice = () => {
            if(cart.value.length === 0) return;
            currentOrderId.value = 'NVM-' + Math.floor(Math.random() * 1000000);
            currentDate.value = new Date().toLocaleString();
            isCartOpen.value = false; // Tutup laci troli
            showInvoice.value = true; // Buka modal invois
        };

        // NEW: Print PDF
        const printInvoice = () => {
            window.print();
        };

        // WhatsApp Checkout (Ditekan selepas invois)
        const confirmWhatsApp = () => {
            // TUKAR NOMBOR TELEFON DI SINI
            const adminPhoneNumber = "601111111111"; 
            
            let message = `Hi NVM Store! Saya ingin mengesahkan pesanan saya:%0A%0A*ORDER ID: ${currentOrderId.value}*%0A%0A`;
            cart.value.forEach((item, index) => {
                message += `${index + 1}. *${item.name}* (Saiz: ${item.selectedSize}) - RM ${item.price.toFixed(2)}%0A`;
            });
            message += `%0A💰 *Total Keseluruhan: RM ${cartTotal.value.toFixed(2)}*%0A%0A`;

            const existingOrders = JSON.parse(localStorage.getItem('nvm_database_orders')) || [];
            existingOrders.push({
                id: currentOrderId.value,
                date: currentDate.value,
                items: cart.value,
                total: cartTotal.value
            });
            localStorage.setItem('nvm_database_orders', JSON.stringify(existingOrders));

            toastMessage.value = "Membuka WhatsApp...";
            showToast.value = true;
            
            window.open(`https://wa.me/${adminPhoneNumber}?text=${message}`, '_blank');
            
            // Clear cart & close invoice
            cart.value = [];
            localStorage.removeItem('nvm_cart');
            showInvoice.value = false;
        };

        const sendMessage = (e) => {
            alert("Mesej anda telah dihantar.");
            e.target.reset();
        };

        onMounted(() => { 
            AOS.init({ duration: 800, once: true, offset: 50 }); 
            
            // NEW: Auto tukar gambar Hero setiap 4 saat (Slideshow)
            setInterval(() => {
                currentHeroIndex.value = (currentHeroIndex.value + 1) % heroImages.value.length;
            }, 4000);
        });

        return { 
            currentPage, cart, cartCount, cartTotal, isCartOpen, allProducts, 
            showToast, toastMessage, isImageModalOpen, selectedImage,
            heroImages, currentHeroIndex, showInvoice, currentOrderId, currentDate,
            navigate, addToCart, removeFromCart, openInvoice, printInvoice, confirmWhatsApp, openImage, closeImage, sendMessage
        };
    }
}).mount('#app');