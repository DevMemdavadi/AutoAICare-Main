import { Badge, Button, Card, Modal, Select } from '@/components/ui';
import Alert from '@/components/ui/Alert';
import api from '@/utils/api';
import { Minus, Package, Plus, Search, ShoppingCart, Star } from 'lucide-react';
import { useEffect, useState } from 'react';

const AccessoriesStore = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCartModal, setShowCartModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [filters, setFilters] = useState({
    category: '',
    priceRange: '',
    search: '',
  });

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/store/products/');
      setProducts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart) => {
    localStorage.setItem('cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    let newCart;
    
    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    
    saveCart(newCart);
  };

  const updateQuantity = (productId, delta) => {
    const newCart = cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean);
    
    saveCart(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.id !== productId);
    saveCart(newCart);
  };

  const handleCheckout = async () => {
    try {
      const orderData = {
        items: cart.map(item => ({
          product: item.id,
          quantity: item.quantity,
        })),
      };
      
      await api.post('/store/orders/', orderData);
      setAlert({ show: true, type: 'success', message: 'Order placed successfully!' });
      saveCart([]);
      setShowCartModal(false);
    } catch (error) {
      console.error('Error placing order:', error);
      setAlert({ show: true, type: 'error', message: 'Failed to place order' });
    }
  };

  const filteredProducts = products.filter(product => {
    if (!product.in_stock) return false;
    if (filters.category && product.category !== filters.category) return false;
    if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      if (max) {
        if (product.price < min || product.price > max) return false;
      } else {
        if (product.price < min) return false;
      }
    }
    return true;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: '', message: '' })}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Accessories Store</h1>
          <p className="text-gray-600 mt-1">Shop car accessories and products</p>
        </div>
        <Button onClick={() => setShowCartModal(true)} className="relative">
          <ShoppingCart size={18} className="mr-2" />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-10 w-full"
            />
          </div>
          <Select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'exterior', label: 'Exterior' },
              { value: 'interior', label: 'Interior' },
              { value: 'electronics', label: 'Electronics' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'performance', label: 'Performance' },
            ]}
          />
          <Select
            value={filters.priceRange}
            onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
            options={[
              { value: '', label: 'All Prices' },
              { value: '0-25', label: '₹0 - ₹25' },
              { value: '25-50', label: '₹25 - ₹50' },
              { value: '50-100', label: '₹50 - ₹100' },
              { value: '100', label: '₹100+' },
            ]}
          />
        </div>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow group"
            >
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package size={64} className="text-gray-400" />
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 line-clamp-2 flex-1">{product.name}</h3>
                  {product.in_stock ? (
                    <Badge variant="success">In Stock</Badge>
                  ) : (
                    <Badge variant="default">Out</Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-green-600">₹{product.price}</span>
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {product.rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {product.stock_quantity} available
                  </span>
                </div>

                <Button
                  onClick={() => addToCart(product)}
                  className="w-full mt-4"
                  disabled={!product.in_stock}
                >
                  <ShoppingCart size={16} className="mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No products found</p>
          </div>
        )}
      </div>

      {/* Cart Modal */}
      <Modal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        title="Shopping Cart"
        size="large"
        footer={
          cart.length > 0 ? (
            <>
              <Button variant="outline" onClick={() => setShowCartModal(false)}>
                Continue Shopping
              </Button>
              <Button onClick={handleCheckout}>
                Checkout (${cartTotal.toFixed(2)})
              </Button>
            </>
          ) : null
        }
      >
        {cart.length > 0 ? (
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg"
              >
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                  ) : (
                    <Package size={32} className="text-gray-400" />
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-600">₹{item.price} each</p>
                  <p className="text-sm font-bold text-green-600 mt-1">
                    Subtotal: ₹{(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-600 hover:text-red-800 font-medium text-sm"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total ({cartCount} items):</span>
                <span className="text-2xl text-green-600">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Your cart is empty</p>
            <Button
              onClick={() => setShowCartModal(false)}
              className="mt-4"
            >
              Start Shopping
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccessoriesStore;
