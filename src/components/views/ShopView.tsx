import React, { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  HeartIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  StarIcon,
  TrashIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import {
  OFFICIAL_CARDS,
  SHOP_CATEGORIES,
  SHOP_COUPONS,
  SHOP_ITEMS,
} from '../../data/neoSeed';
import {
  CartItem,
  OfficialCardId,
  ShopCategory,
  ShopCoupon,
  ShopItem,
  UserAccount,
} from '../../types/neo';
import { formatBRL, formatFullDate, isCreditAllowed } from '../../utils/formatters';
import { NeoLogo } from '../NeoLogo';
import { OfficialCardVisual } from '../OfficialCardVisual';

interface ShopViewProps {
  account: UserAccount;
  hideBalances: boolean;
  onToggleFavorite: (itemId: string) => void;
  onViewProduct: (itemId: string) => void;
  onAdvanceShopOrderStage: (orderId: string) => void;
  onCheckoutCart: (
    cartItems: CartItem[],
    source: 'account' | OfficialCardId,
    deliveryAddress: string,
    coupon?: ShopCoupon
  ) => { ok: boolean; error?: string; totalPaid: number; cashback: number };
}

const DELIVERY_STAGES = ['Confirmado', 'Em preparação', 'Em transporte', 'Entregue'] as const;

export const ShopView: React.FC<ShopViewProps> = ({
  account,
  hideBalances,
  onToggleFavorite,
  onViewProduct,
  onAdvanceShopOrderStage,
  onCheckoutCart,
}) => {
  const creditAllowed = isCreditAllowed(account);

  const [shopTab, setShopTab] = useState<'explore' | 'favorites' | 'cart' | 'orders'>('explore');
  const [category, setCategory] = useState<'Tudo' | ShopCategory>('Tudo');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState<ShopItem | null>(null);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<ShopCoupon | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(
    account.address || 'Av. Paulista, 1420 · São Paulo, SP'
  );
  const [paySource, setPaySource] = useState<'account' | OfficialCardId>(
    account.cards.find((c) => !c.frozen && (creditAllowed || c.mode === 'debit_only'))?.id ||
      'account'
  );
  const [installments, setInstallments] = useState(1);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseDone, setPurchaseDone] = useState<{
    summary: string;
    totalPaid: number;
    cashback: number;
    source: 'account' | OfficialCardId;
  } | null>(null);

  const dailyOffers = useMemo(() => SHOP_ITEMS.filter((i) => i.dailyOffer), []);
  const popularItems = useMemo(() => SHOP_ITEMS.filter((i) => i.popular), []);
  const recommendedItems = useMemo(() => SHOP_ITEMS.filter((i) => i.recommended), []);
  const neoExclusiveItems = useMemo(() => SHOP_ITEMS.filter((i) => i.neoExclusive), []);
  const recentlyViewedItems = useMemo(
    () =>
      account.recentlyViewedShopIds
        .map((id) => SHOP_ITEMS.find((it) => it.id === id))
        .filter((it): it is ShopItem => Boolean(it)),
    [account.recentlyViewedShopIds]
  );

  const favoriteItems = useMemo(
    () => SHOP_ITEMS.filter((i) => account.shopFavorites.includes(i.id)),
    [account.shopFavorites]
  );

  const eligiblePaymentCards = useMemo(
    () => account.cards.filter((c) => !c.frozen && (creditAllowed || c.mode === 'debit_only')),
    [account.cards, creditAllowed]
  );

  const visibleItems = useMemo(() => {
    const base = shopTab === 'favorites' ? favoriteItems : SHOP_ITEMS;
    return base.filter((i) => {
      if (shopTab === 'explore' && category !== 'Tudo' && i.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${i.title} ${i.brand} ${i.category} ${i.description}`.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [shopTab, favoriteItems, category, search]);

  const relatedItems = useMemo(() => {
    if (!detailItem) return [];
    return SHOP_ITEMS.filter(
      (i) => i.id !== detailItem.id && (i.category === detailItem.category || i.popular)
    ).slice(0, 3);
  }, [detailItem]);

  const openDetail = (item: ShopItem) => {
    setDetailItem(item);
    setActiveGalleryIdx(0);
    onViewProduct(item.id);
  };

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartSubtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const discountValue = appliedCoupon
    ? Number(((cartSubtotal * appliedCoupon.discountPercent) / 100).toFixed(2))
    : 0;
  const cartTotal = Math.max(0, Number((cartSubtotal - discountValue).toFixed(2)));
  const estimatedCashback = cart.reduce(
    (sum, c) => sum + (c.item.price * c.quantity * c.item.cashbackPercent) / 100,
    0
  );

  const addToCart = (item: ShopItem, openCart = false) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    setPurchaseDone(null);
    if (openCart) {
      setDetailItem(null);
      setShopTab('cart');
    }
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    const found = SHOP_COUPONS.find((c) => c.code === code);
    if (!found) {
      setCouponMsg('Cupom não encontrado. Experimente NEO10 ou NEOPAY5.');
      setAppliedCoupon(null);
      return;
    }
    if (cartSubtotal < found.minAmount) {
      setCouponMsg(`Cupom ${found.code} exige pedido mínimo de ${formatBRL(found.minAmount)}.`);
      return;
    }
    setAppliedCoupon(found);
    setCouponMsg(`Cupom ${found.code} aplicado (-${found.discountPercent}%).`);
  };

  const handleConfirmCartCheckout = () => {
    if (cart.length === 0) return;
    setPurchaseError('');
    if (!deliveryAddress.trim()) {
      setPurchaseError('Informe um endereço para entrega do pedido.');
      return;
    }
    const res = onCheckoutCart(
      cart,
      paySource,
      deliveryAddress.trim(),
      appliedCoupon || undefined
    );
    if (!res.ok) {
      setPurchaseError(res.error || 'Não foi possível concluir a compra.');
      return;
    }
    const summary = cart.map((c) => `${c.quantity}x ${c.item.title}`).join(', ');
    setPurchaseDone({
      summary,
      totalPaid: res.totalPaid,
      cashback: res.cashback,
      source: paySource,
    });
    setCart([]);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg('');
    setShopTab('orders');
  };

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#3C3C3B]">Neo Shop</h1>
          <p className="text-xs text-[#6E6E6B]">
            Marketplace integrado · Cashback demonstrativo em cada pedido
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#E0E0E0]/55 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'explore', label: 'Explorar' },
              { id: 'favorites', label: `Favoritos (${favoriteItems.length})` },
              { id: 'cart', label: `Carrinho (${cartCount})` },
              { id: 'orders', label: `Pedidos (${account.shopOrders.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setShopTab(t.id);
                setDetailItem(null);
                setPurchaseError('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                shopTab === t.id
                  ? 'bg-white text-[#3C3C3B] shadow-sm'
                  : 'text-[#6E6E6B] hover:text-[#3C3C3B]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Purchase Confirmed Banner */}
      {purchaseDone && (
        <section className="neo-glass rounded-3xl p-5 border border-[#7D8A71]/45 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#7D8A71]/15 text-[#4B5842] flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#3C3C3B]">
                Pedido demonstrativo confirmado: {purchaseDone.summary}
              </h2>
              <p className="text-xs text-[#6E6E6B] mt-0.5">
                Pago {formatBRL(purchaseDone.totalPaid)} · Cashback de{' '}
                <strong className="text-[#2E7D32]">+{formatBRL(purchaseDone.cashback)}</strong>{' '}
                creditado na conta
                {purchaseDone.source !== 'account' &&
                  ` · ${OFFICIAL_CARDS[purchaseDone.source].name}`}
              </p>
            </div>
          </div>
          {purchaseDone.source !== 'account' && (
            <OfficialCardVisual cardId={purchaseDone.source} size="sm" />
          )}
        </section>
      )}

      {/* PRODUCT DETAIL SCREEN */}
      {detailItem && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-7 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDetailItem(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3C3C3B] hover:text-[#7D8A71] cursor-pointer"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Voltar à vitrine</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(detailItem.id)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3C3C3B] cursor-pointer"
            >
              {account.shopFavorites.includes(detailItem.id) ? (
                <HeartSolidIcon className="w-5 h-5 text-red-500" />
              ) : (
                <HeartIcon className="w-5 h-5" />
              )}
              <span>Favorito</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Multi-slide Visual Gallery */}
            <div className="md:col-span-5 space-y-3">
              <div
                className="h-56 rounded-3xl p-5 flex flex-col justify-between text-white"
                style={{
                  background: `linear-gradient(135deg, ${detailItem.highlightColor} 0%, #3C3C3B 100%)`,
                }}
              >
                <div className="flex items-center justify-between text-xs text-white/85">
                  <span>{detailItem.brand}</span>
                  <span>{detailItem.category}</span>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {detailItem.cashbackPercent}% de cashback
                  </span>
                  <h2 className="font-display font-bold text-xl mt-1">{detailItem.title}</h2>
                  <p className="text-[11px] text-white/75 mt-1">
                    {detailItem.galleryLabels[activeGalleryIdx] || detailItem.galleryLabels[0]}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {detailItem.galleryLabels.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveGalleryIdx(idx)}
                    className={`p-2 rounded-xl border text-[11px] font-medium truncate cursor-pointer ${
                      activeGalleryIdx === idx
                        ? 'bg-[#3C3C3B] text-white border-[#3C3C3B]'
                        : 'bg-white/80 text-[#6E6E6B] border-[#E0E0E0]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs text-[#6E6E6B]">
                <StarIcon className="w-4 h-4 text-[#7D8A71]" />
                <span className="font-semibold text-[#3C3C3B] tabular-nums">
                  {detailItem.rating.toFixed(1)}
                </span>
                <span>·</span>
                <span>{detailItem.reviewCount} avaliações</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <TruckIcon className="w-3.5 h-3.5" />
                  {detailItem.deliveryEstimate}
                </span>
              </div>

              <p className="text-sm text-[#6E6E6B] leading-relaxed">{detailItem.description}</p>

              <ul className="space-y-1.5 text-xs text-[#3C3C3B]">
                {detailItem.specs.map((sp) => (
                  <li key={sp} className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-[#7D8A71] shrink-0" />
                    <span>{sp}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-end justify-between gap-4 pt-3 border-t border-[#E0E0E0]/65">
                <div>
                  {detailItem.originalPrice && (
                    <span className="text-xs text-[#6E6E6B] line-through block tabular-nums">
                      De {formatBRL(detailItem.originalPrice)}
                    </span>
                  )}
                  <p className="font-display font-bold text-2xl text-[#3C3C3B] tabular-nums">
                    {formatBRL(detailItem.price)}
                  </p>
                  <p className="text-xs text-[#6E6E6B] mt-0.5 tabular-nums">
                    {creditAllowed
                      ? `À vista no Pix/Débito ou até ${detailItem.installmentsMax}x de ${formatBRL(
                          detailItem.price / detailItem.installmentsMax
                        )} (demo)`
                      : 'Pagamento exclusivo à vista via saldo em conta ou débito (14+)'}
                  </p>
                  <p className="text-xs text-[#2E7D32] tabular-nums mt-0.5">
                    Cashback +{formatBRL((detailItem.price * detailItem.cashbackPercent) / 100)}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => addToCart(detailItem, false)}
                    className="min-h-[44px] px-4 rounded-xl bg-white border border-[#E0E0E0] text-xs font-medium text-[#3C3C3B] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addToCart(detailItem, true)}
                    className="min-h-[44px] px-5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingBagIcon className="w-4 h-4" />
                    <span>Comprar agora</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews + Related */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4 border-t border-[#E0E0E0]/65">
            <div className="space-y-2.5">
              <h3 className="font-display font-bold text-sm text-[#3C3C3B]">
                Avaliações verificadas
              </h3>
              {detailItem.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-2xl bg-white/80 border border-[#E0E0E0] text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-[#3C3C3B]">
                    <span>{rev.author}</span>
                    <span className="text-[#7D8A71] tabular-nums">{rev.rating}/5 · {rev.dateLabel}</span>
                  </div>
                  <p className="text-[#6E6E6B]">{rev.comment}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2.5">
              <h3 className="font-display font-bold text-sm text-[#3C3C3B]">
                Produtos relacionados
              </h3>
              <div className="space-y-2">
                {relatedItems.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => openDetail(rel)}
                    className="w-full p-3 rounded-2xl bg-white/80 hover:bg-white border border-[#E0E0E0] flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#3C3C3B] truncate">{rel.title}</p>
                      <p className="text-[11px] text-[#6E6E6B]">
                        {rel.brand} · +{rel.cashbackPercent}% volta
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#3C3C3B] tabular-nums shrink-0 ml-2">
                      {formatBRL(rel.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CART & INTEGRATED CHECKOUT */}
      {!detailItem && shopTab === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <section className="lg:col-span-7 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-base text-[#3C3C3B]">
              Seu carrinho ({cartCount})
            </h2>

            {cart.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingCartIcon className="w-8 h-8 text-[#6E6E6B]/60 mx-auto" />
                <p className="text-sm font-medium text-[#3C3C3B]">Carrinho vazio</p>
                <button
                  type="button"
                  onClick={() => setShopTab('explore')}
                  className="text-xs font-medium text-[#7D8A71] hover:underline cursor-pointer"
                >
                  Explorar vitrine do Neo Shop
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(({ item, quantity }) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/85 border border-[#E0E0E0] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#3C3C3B] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#6E6E6B] tabular-nums">
                        {formatBRL(item.price)} un. · +{item.cashbackPercent}% cashback
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-[#F4F4F1] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
                        aria-label="Diminuir quantidade"
                      >
                        <MinusIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold tabular-nums w-5 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-[#F4F4F1] flex items-center justify-center text-[#3C3C3B] cursor-pointer"
                        aria-label="Aumentar quantidade"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, -quantity)}
                        className="w-8 h-8 rounded-lg text-red-600 flex items-center justify-center cursor-pointer"
                        aria-label="Remover item"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#E0E0E0]/65 space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#3C3C3B]">
                <MapPinIcon className="w-4 h-4 text-[#7D8A71]" />
                <span>Endereço de entrega</span>
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Rua, número, cidade e UF"
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-white/85 border border-[#E0E0E0] text-xs"
              />
            </div>
          </section>

          <section className="lg:col-span-5 neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
            <NeoLogo variant="neopay" size="sm" />

            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="block text-xs font-medium text-[#3C3C3B]">
                Cupom promocional (NEO10 ou NEOPAY5)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Digite o código"
                  className="flex-1 min-h-[40px] px-3 rounded-xl bg-white border border-[#E0E0E0] text-xs uppercase"
                />
                <button
                  type="submit"
                  className="min-h-[40px] px-4 rounded-xl bg-[#3C3C3B]/10 text-xs font-medium text-[#3C3C3B] cursor-pointer"
                >
                  Aplicar
                </button>
              </div>
              {couponMsg && (
                <p className="text-[11px] text-[#4B5842] font-medium">{couponMsg}</p>
              )}
            </form>

            <div className="space-y-2 pt-3 border-t border-[#E0E0E0]/65 text-xs">
              <div className="flex justify-between text-[#6E6E6B]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatBRL(cartSubtotal)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-[#2E7D32]">
                  <span>Desconto ({appliedCoupon?.code})</span>
                  <span className="tabular-nums">-{formatBRL(discountValue)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#2E7D32]">
                <span>Cashback estimado</span>
                <span className="tabular-nums">+{formatBRL(estimatedCashback)}</span>
              </div>
              <div className="flex justify-between text-base font-display font-bold text-[#3C3C3B] pt-2 border-t border-[#E0E0E0]/60">
                <span>Total</span>
                <span className="tabular-nums">{formatBRL(cartTotal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#3C3C3B]">Forma de pagamento</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaySource('account');
                    setInstallments(1);
                  }}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer ${
                    paySource === 'account'
                      ? 'bg-white border-[#7D8A71] ring-2 ring-[#7D8A71]/20'
                      : 'bg-white/60 border-[#E0E0E0]'
                  }`}
                >
                  <p className="text-xs font-semibold text-[#3C3C3B]">Saldo em conta</p>
                  <p className="text-[11px] text-[#6E6E6B] tabular-nums">
                    {formatBRL(account.balance, hideBalances)}
                  </p>
                </button>
                {eligiblePaymentCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setPaySource(card.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 text-left cursor-pointer ${
                      paySource === card.id
                        ? 'bg-white border-[#7D8A71] ring-2 ring-[#7D8A71]/20'
                        : 'bg-white/60 border-[#E0E0E0]'
                    }`}
                  >
                    <OfficialCardVisual cardId={card.id} size="xs" frozen={card.frozen} />
                    <span className="text-xs font-semibold text-[#3C3C3B] truncate">
                      {card.label}
                    </span>
                  </button>
                ))}
              </div>

              {creditAllowed && paySource !== 'account' && cartTotal > 0 && (
                <div className="pt-1">
                  <label className="block text-[11px] text-[#6E6E6B] mb-1">Parcelamento</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full min-h-[38px] px-3 rounded-xl bg-white border border-[#E0E0E0] text-xs tabular-nums"
                  >
                    {[1, 2, 3, 6].map((n) => (
                      <option key={n} value={n}>
                        {n}x de {formatBRL(cartTotal / n)} sem juros (demo)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {purchaseError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {purchaseError}
              </p>
            )}

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleConfirmCartCheckout}
              className="w-full min-h-[46px] rounded-2xl bg-[#3C3C3B] text-white text-sm font-medium disabled:opacity-45 cursor-pointer"
            >
              Confirmar pedido (demo)
            </button>
          </section>
        </div>
      )}

      {/* ORDERS HISTORY WITH DELIVERY TRACKING */}
      {!detailItem && shopTab === 'orders' && (
        <section className="neo-glass rounded-[28px] p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-bold text-base text-[#3C3C3B]">
            Meus pedidos e acompanhamento
          </h2>
          {account.shopOrders.length === 0 ? (
            <p className="text-xs text-[#6E6E6B] py-4">Nenhum pedido realizado ainda.</p>
          ) : (
            <div className="space-y-3">
              {account.shopOrders.map((ord) => {
                const stageIdx = DELIVERY_STAGES.indexOf(ord.deliveryStage);
                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-white/85 border border-[#E0E0E0] space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {ord.cardId ? (
                          <OfficialCardVisual cardId={ord.cardId} size="xs" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#7D8A71]/15 flex items-center justify-center text-[#4B5842]">
                            <ReceiptPercentIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#3C3C3B] truncate">
                            {ord.itemsSummary}
                          </p>
                          <p className="text-xs text-[#6E6E6B]">
                            {formatFullDate(ord.dateISO)} · {ord.sourceLabel} · Rastreio{' '}
                            {ord.trackingCode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#3C3C3B] tabular-nums">
                          {formatBRL(ord.totalPaid)}
                        </p>
                        <p className="text-[11px] text-[#2E7D32] tabular-nums">
                          +{formatBRL(ord.cashbackEarned)} cashback
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-[#E0E0E0]/60">
                      {DELIVERY_STAGES.map((st, idx) => (
                        <div
                          key={st}
                          className={`text-center py-1.5 px-1 rounded-lg text-[10px] font-medium ${
                            idx <= stageIdx
                              ? 'bg-[#7D8A71]/18 text-[#4B5842]'
                              : 'bg-[#F4F4F1] text-[#6E6E6B]'
                          }`}
                        >
                          {st}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6E6E6B]">
                      <span>Entrega: {ord.deliveryAddress}</span>
                      {ord.deliveryStage !== 'Entregue' && (
                        <button
                          type="button"
                          onClick={() => onAdvanceShopOrderStage(ord.id)}
                          className="font-medium text-[#7D8A71] hover:underline cursor-pointer"
                        >
                          Avançar entrega (demo)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* EXPLORE & FAVORITES CATALOG */}
      {!detailItem && (shopTab === 'explore' || shopTab === 'favorites') && (
        <div className="space-y-5">
          {shopTab === 'explore' && (
            <>
              {/* Compact Featured Promotional Banner + Honest Demo Label */}
              <div className="rounded-3xl bg-[#3C3C3B] text-white p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <span className="text-[11px] text-white/75 inline-flex items-center gap-1">
                    <InformationCircleIcon className="w-3.5 h-3.5" />
                    Marketplace demonstrativo · Cupom NEO10 ativo
                  </span>
                  <h2 className="font-display font-bold text-lg sm:text-xl">
                    Curadoria de produtos com retorno em saldo na hora
                  </h2>
                </div>
                <NeoLogo variant="neopay" size="sm" className="text-white" />
              </div>

              {/* Search & 8 Categories */}
              <div className="space-y-3">
                <div className="relative max-w-md">
                  <MagnifyingGlassIcon className="w-4 h-4 text-[#6E6E6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produto, marca ou categoria..."
                    className="w-full min-h-[42px] pl-10 pr-4 rounded-xl bg-white/85 border border-[#E0E0E0] text-sm"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#E0E0E0]/55">
                  {(['Tudo', ...SHOP_CATEGORIES] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        category === cat
                          ? 'bg-white text-[#3C3C3B] shadow-sm'
                          : 'text-[#6E6E6B] hover:text-[#3C3C3B]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated Horizontal Strips when unfiltered */}
              {category === 'Tudo' && !search.trim() && (
                <div className="space-y-4">
                  {/* Ofertas do dia */}
                  <section className="space-y-2">
                    <h2 className="font-display font-bold text-sm text-[#3C3C3B] px-1">
                      Ofertas do dia
                    </h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {dailyOffers.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openDetail(item)}
                          className="min-w-[225px] neo-glass rounded-2xl p-3.5 text-left hover:bg-white/95 shrink-0 cursor-pointer"
                        >
                          <p className="text-[11px] font-medium text-[#7D8A71]">
                            {item.brand} · {item.cashbackPercent}% volta
                          </p>
                          <p className="font-display font-bold text-sm text-[#3C3C3B] truncate mt-0.5">
                            {item.title}
                          </p>
                          <p className="text-xs font-bold text-[#3C3C3B] tabular-nums mt-1">
                            {formatBRL(item.price)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Produtos populares + Recomendações */}
                  <section className="space-y-2">
                    <h2 className="font-display font-bold text-sm text-[#3C3C3B] px-1">
                      Populares &amp; Recomendados para você
                    </h2>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {[...popularItems, ...recommendedItems]
                        .filter((it, idx, arr) => arr.findIndex((x) => x.id === it.id) === idx)
                        .slice(0, 5)
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openDetail(item)}
                            className="min-w-[215px] neo-glass rounded-2xl p-3.5 text-left hover:bg-white/95 shrink-0 cursor-pointer"
                          >
                            <p className="text-[11px] text-[#6E6E6B]">{item.category}</p>
                            <p className="font-display font-bold text-xs text-[#3C3C3B] truncate mt-0.5">
                              {item.title}
                            </p>
                            <p className="text-xs font-bold text-[#3C3C3B] tabular-nums mt-1">
                              {formatBRL(item.price)}
                            </p>
                          </button>
                        ))}
                    </div>
                  </section>

                  {/* Vistos recentemente + Benefícios exclusivos Neo */}
                  {recentlyViewedItems.length > 0 && (
                    <section className="space-y-2">
                      <h2 className="font-display font-bold text-sm text-[#3C3C3B] px-1">
                        Vistos recentemente · Exclusivos Neo ({neoExclusiveItems.length})
                      </h2>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {recentlyViewedItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openDetail(item)}
                            className="min-w-[210px] neo-glass rounded-2xl p-3 text-left hover:bg-white/95 shrink-0 cursor-pointer"
                          >
                            <p className="font-display font-bold text-xs text-[#3C3C3B] truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-[#7D8A71] tabular-nums mt-0.5">
                              {formatBRL(item.price)}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </>
          )}

          {/* Full Product Grid */}
          {visibleItems.length === 0 ? (
            <div className="neo-glass rounded-3xl p-8 text-center">
              <p className="text-sm font-medium text-[#3C3C3B]">
                {shopTab === 'favorites'
                  ? 'Você ainda não favoritou nenhum produto.'
                  : 'Nenhum produto encontrado com os filtros atuais.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleItems.map((item) => {
                const cashbackVal = (item.price * item.cashbackPercent) / 100;
                const isFav = account.shopFavorites.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="neo-glass rounded-3xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div
                        onClick={() => openDetail(item)}
                        className="h-32 rounded-2xl p-4 flex flex-col justify-between text-white relative overflow-hidden cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${item.highlightColor} 0%, #3C3C3B 100%)`,
                        }}
                      >
                        <div className="flex items-center justify-between text-xs text-white/85">
                          <span>{item.brand}</span>
                          <span className="inline-flex items-center gap-1 font-medium">
                            <SparklesIcon className="w-3.5 h-3.5" />
                            {item.cashbackPercent}% volta
                          </span>
                        </div>
                        <p className="font-display font-bold text-base leading-snug">
                          {item.title}
                        </p>
                      </div>

                      <div className="flex items-start justify-between gap-2 mt-3.5">
                        <p className="text-xs text-[#6E6E6B] leading-relaxed">
                          {item.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.id)}
                          className="p-1.5 rounded-lg text-[#6E6E6B] hover:text-red-500 cursor-pointer shrink-0"
                          aria-label="Favoritar produto"
                        >
                          {isFav ? (
                            <HeartSolidIcon className="w-5 h-5 text-red-500" />
                          ) : (
                            <HeartIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E0E0E0]/65 flex items-center justify-between gap-2">
                      <div>
                        {item.originalPrice && (
                          <span className="text-[11px] text-[#6E6E6B] line-through block tabular-nums">
                            {formatBRL(item.originalPrice)}
                          </span>
                        )}
                        <p className="font-display font-bold text-lg text-[#3C3C3B] tabular-nums">
                          {formatBRL(item.price)}
                        </p>
                        <p className="text-[11px] text-[#2E7D32] tabular-nums">
                          +{formatBRL(cashbackVal)} cashback
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => addToCart(item, false)}
                          className="min-h-[40px] w-10 rounded-xl bg-white border border-[#E0E0E0] text-[#3C3C3B] flex items-center justify-center cursor-pointer"
                          aria-label="Adicionar ao carrinho"
                        >
                          <ShoppingCartIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDetail(item)}
                          className="min-h-[40px] px-3.5 rounded-xl bg-[#3C3C3B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBagIcon className="w-4 h-4" />
                          <span>Ver</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
