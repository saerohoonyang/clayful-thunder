window.Thunder.components.checkout.template=function(e){var t='<div class="thunder--checkout thunder--'+e.options.type+'-checkout"><div class="thunder--checkout-process"><div class="thunder--cart-items"><h2 class="'+(e.options.back?"thunder--with-back-button":"")+'">'+e.m("confirmItems")+"</h2>";e.options.back&&(t+='<a class="thunder--back-to-cart">'+e.m("backToCart")+"</a>"),t+='<table class="thunder--table"><thead><tr><th colspan="2">'+e.m("itemInfo")+"</th><th>"+e.m("itemQuantity")+"</th><th>"+e.m("itemPrice")+"</th></tr></thead><tbody>";var a=e.cart.items;if(a)for(var s,r=-1,d=a.length-1;r<d;){if(s=a[r+=1],t+='<tr class="thunder--cart-item" data-item="'+s._id+'"><td class="thunder--cart-item-thumbnail-container"><img src="'+e.imageURL(s.product.thumbnail,120,120)+'" alt="'+s.product.name+'" class="thunder--cart-item-thumbnail"></td><td class="thunder--cart-item-name"><div class="thunder--cart-item-summary"><h3 class="thunder--cart-item-name">'+s.product.name+"</h3><ul>",s.variant.types.length>0&&(t+='<li class="thunder--cart-item-option"><span class="thunder--cart-entity-label">'+e.m("itemOption")+"</span>"+e.variantName(s.variant)+"</li>"),s.shippingMethod&&(t+='<li class="thunder--cart-item-shipping-method"><span class="thunder--cart-entity-label">'+e.m("shippingMethod")+"</span>"+s.shippingMethod.name+"</li>"),s.appliedCoupon&&(t+='<li class="thunder--cart-item-applied-coupon"><span class="thunder--cart-entity-label">'+e.m("appliedCoupon")+"</span>"+s.appliedCoupon.name+"</li>"),t+="</ul>",s.applicableCoupons.length>0){t+='<div class="thunder--cart-item-coupon-wrapper"><select class="thunder--cart-item-coupon" data-item="'+s._id+'"><option value=""'+(s.appliedCoupon?"":"selected")+">"+e.m("selectProductCoupon")+"</option>";var i=s.applicableCoupons;if(i)for(var n,c=-1,l=i.length-1;c<l;)n=i[c+=1],t+='<option value="'+n._id+'"'+(s.appliedCoupon&&s.appliedCoupon._id===n._id?"selected":"")+">"+n.name+" ("+n.discount.value.converted+")</option>";t+="</select></div>"}if(t+='</div></td><td class="thunder--cart-item-quantity"><span class="thunder--cart-item-quantity-label hidden">'+e.m("itemQuantity")+'</span><span class="thunder--cart-item-quantity-value">'+s.quantity.converted+'</span></td><td class="thunder--cart-item-price"><span class="thunder--cart-item-sale-price">'+s.price.sale.converted+"</span>",s.price.sale.converted!==s.price.original.converted&&(t+='<span class="thunder--cart-item-compare-price">'+s.price.original.converted+'</span><span class="thunder--cart-item-discounted">(-'+s.discounted.converted+")</span>"),t+="</td></tr>",s.bundleItems&&s.bundleItems.length>0){var o=s.bundleItems;if(o)for(var p,u=-1,m=o.length-1;u<m;)p=o[u+=1],t+='<tr class="thunder--cart-item thunder--cart-bundle-item" data-item="'+s._id+'" data-bundle-item="'+p._id+'"><td class="thunder--cart-item-thumbnail-container"></td><td class="thunder--cart-item-name"><div class="thunder--cart-item-summary"><h3 class="thunder--cart-item-name">'+p.product.name+"</h3><ul>",p.variant.types.length>0&&(t+='<li class="thunder--cart-item-option"><span class="thunder--cart-entity-label">'+e.m("itemOption")+"</span>"+e.variantName(p.variant)+"</li>"),p.shippingMethod&&(t+='<li class="thunder--cart-item-shipping-method"><span class="thunder--cart-entity-label">'+e.m("shippingMethod")+"</span>"+p.shippingMethod.name+"</li>"),t+='</ul></div></td><td class="thunder--cart-item-quantity"><span class="thunder--cart-item-quantity-label hidden">'+e.m("itemQuantity")+'</span><span class="thunder--cart-item-quantity-value">'+p.quantity.converted+'</span></td><td class="thunder--cart-item-price"><span class="thunder--cart-item-sale-price">'+p.price.sale.converted+"</span>",p.price.sale.converted!==p.price.original.converted&&(t+='<span class="thunder--cart-item-compare-price">'+p.price.original.converted+'</span><span class="thunder--cart-item-discounted">(-'+p.discounted.converted+")</span>"),t+="</td></tr>"}}if(t+="</tbody>",e.cart.appliedCoupon||e.cart.applicableCoupons.length>0){if(t+='<tfoot><tr><td class="thunder--cart-coupon-wrapper" colspan="4">',e.cart.appliedCoupon&&(t+='<div class="thunder--cart-applied-coupon"><span class="thunder--cart-entity-label">'+e.m("appliedCoupon")+"</span>"+e.cart.appliedCoupon.name+"</div>"),e.cart.applicableCoupons.length>0){t+='<select class="thunder--cart-coupon"><option value=""'+(e.cart.appliedCoupon?"":"selected")+">"+e.m("selectCartCoupon")+"</option>";var h=e.cart.applicableCoupons;if(h)for(var n,v=-1,b=h.length-1;v<b;)n=h[v+=1],t+='<option value="'+n._id+'"'+(e.cart.appliedCoupon&&e.cart.appliedCoupon._id===n._id?"selected":"")+">"+n.name+" ("+n.discount.value.converted+")</option>";t+="</select>"}t+="</td></tr></tfoot>"}t+="</table>",e.coupons.length>0&&(t+='<div class="thunder--action-coupons"><button class="thunder--apply-coupons">'+e.m("applyCoupons")+"</button></div>"),t+='</div><div class="thunder--customer thunder--form"><h2>'+e.m("setCustomer")+"</h2>";var y=e.customerFields;if(y)for(var f,g=-1,C=y.length-1;g<C;)f=y[g+=1],t+='<div class="thunder--address-'+e.kebabCase(f.key)+'"><label for="'+f.key+'">'+e.m(f.translationKey)+" ",f.required&&(t+='<span class="form-required-marker">('+e.m("required")+")</span>"),t+='</label><input type="'+("email"===f.key?"email":"text")+'" name="customer.'+f.key+'" placeholder="'+e.m(f.translationKey)+'" ',e.isAuthenticated&&(t+="readonly"),t+=" ",f.required&&(t+="required"),t+="></div>";e.isAuthenticated&&(t+='<div class="thunder--update-customer"><a class="thunder--go-to-update-customer">'+e.m("goToUpdateCustomer")+"</a></div>"),t+='<div class="thunder--same-for-recipient"><input type="checkbox" name="sameForRecipient" id="thunder--same-for-recipient"><label for="thunder--same-for-recipient">'+e.m("sameForRecipient")+'</label></div></div><div class="thunder--address thunder--form"><h2>'+e.m("setShippingAddress")+'</h2><div class="thunder--address-recipient">';var q=e.recipientFields;if(q)for(var f,k=-1,x=q.length-1;k<x;)f=q[k+=1],t+='<div class="thunder--address-'+e.kebabCase(f.key)+'"><label for="'+f.key+'">'+e.m(f.translationKey)+" ",f.required&&(t+='<span class="form-required-marker">('+e.m("required")+")</span>"),t+='</label><input type="text" name="address.'+f.key+'" placeholder="'+e.m(f.translationKey)+'" ',f.required&&(t+="required"),t+="></div>";t+='</div><div class="thunder--address-location"><div class="thunder--address-country"><label for="country">'+e.m("addressCountry")+'</label><select name="address.country" '+e.disabled("country")+" required>";var S=e.countries;if(S)for(var A,T=-1,_=S.length-1;T<_;)A=S[T+=1],t+='<option value="'+A.code+'">'+e.countryName(A.code,A.name)+"</option>";if(t+='</select></div><div class="thunder--address-state"><label for="state">'+e.m("addressState")+'</label><input type="text" name="address.state" placeholder="'+e.m("addressState")+'" '+e.disabled("state")+' required></div><div class="thunder--address-city"><label for="city">'+e.m("addressCity")+'</label><input type="text" name="address.city" placeholder="'+e.m("addressCity")+'" '+e.disabled("city")+' required></div><div class="thunder--address-address1"><label for="address1">'+e.m("addressAddress1")+'</label><input type="text" name="address.address1" placeholder="'+e.m("addressAddress1")+'" '+e.disabled("address1")+' required></div><div class="thunder--address-address2"><label for="address2">'+e.m("addressAddress2")+'</label><input type="text" name="address.address2" placeholder="'+e.m("addressAddress2")+'" '+e.disabled("address2")+' required></div><div class="thunder--address-postcode"><label for="postcode">'+e.m("addressPostcode")+'</label><input type="text" name="address.postcode" placeholder="'+e.m("addressPostcode")+'" '+e.disabled("postcode")+' required></div><div class="thunder--action-address">',e.useSearchAddress&&(t+='<button class="thunder--search-address">'+e.m("searchAddress")+"</button>"),e.useSearchAddress||(t+='<button class="thunder--apply-address">'+e.m("applyAddress")+"</button>"),t+='</div></div></div><div class="thunder--order-payment">',e.isSubscription){t+='<div class="thunder--subscription-details thunder--form"><h2>'+e.m("subscription")+'</h2><div class="thunder--subscription-plan"><label for="subscriptionPlan">'+e.m("subscriptionPlan")+'</label><select name="subscriptionPlan"><option disabled selected>'+e.m("selectSubscriptionPlan")+"</option>";var P=e.subscriptionPlans;if(P)for(var w,I=-1,O=P.length-1;I<O;)w=P[I+=1],t+='<option value="'+w._id+'">'+w.name+"</option>";t+='</select></div><div class="thunder--subscription-starts-at"><label for="subscriptionStartsAt"></label><input type="text" name="subscriptionStartsAt" placeholder="'+e.m("selectSubscriptionStartsAt")+'" data-pickaday><p class="thunder--input-tip first-order-is-immediate">'+e.m("firstOrderIsImmediate")+"</p></div></div>"}if(t+='<div class="thunder--payment-details thunder--form"><h2>'+e.m("payment")+'</h2><div class="thunder--payment-form-container"></div></div></div><div class="thunder--order-request thunder--form"><h2>'+e.m("orderRequest")+'</h2><div><textarea name="request" placeholder="'+e.m("typeOrderRequest")+'"></textarea></div></div></div><div class="thunder--total sticky"><h2>'+("order"===e.options.type?e.m("orderSummary"):e.m("subscriptionSummary"))+'</h2><div class="thunder--total-details">',e.isSubscription&&(t+="<h3>"+e.m("firstOrderSummary")+"</h3>",e.subscription&&(t+='<p class="thunder--first-schedule-time">'+("now"===e.subscription.schedules[0].time?e.m("firstNowOrder"):e.subscription.schedules[0].time.formatted)+"</p>")),t+='<table><tbody><tr class="thunder--item-total"><th>'+e.m("itemTotal")+'</th><td><span class="thunder--cart-items-sale-price">'+e.cart.total.items.price.sale.converted+"</span>",e.cart.total.items.price.sale.converted!==e.cart.total.items.price.original.converted&&(t+='<span class="thunder--cart-items-compare-price">'+e.cart.total.items.price.original.converted+'</span><span class="thunder--cart-items-discounted">(-'+e.cart.total.items.discounted.converted+")</span>"),t+='</td></tr><tr class="thunder--shipping-total"><th>'+e.m("shippingTotal")+"</th><td>"+e.cart.total.shipping.fee.sale.converted+'</td></tr><tr class="thunder--tax-total"><th>'+e.m("taxTotal")+"</th><td>"+e.cart.total.taxed.converted+'</td></tr><tr class="thunder--order-total"><th>'+e.m("orderTotal")+"</th><td>"+e.cart.total.price.withTax.converted+"</td></tr></tbody></table>",e.isSubscription&&e.subscription){t+="<h3>"+e.m("restOrdersSummary")+'</h3><div class="thunder--subscription-schedules"><table><tbody>';var M=e.subscription.schedules.slice(1);if(M)for(var F,R=-1,K=M.length-1;R<K;)F=M[R+=1],t+='<tr class="thunder--schedule-total"><th>'+F.time.formatted+"</th><td>"+F.amount.converted+"</td></tr>";t+="</tbody></table></div>"}return t+='</div><button class="thunder--proceed-checkout thunder--button">'+("order"===e.options.type?e.m("proceedOrder"):e.m("proceedSubscription"))+'</button><ul class="thunder--order-summary-tips"><li>'+e.cart.currency.payment.name+" ("+e.cart.currency.payment.code+")</li><li>"+(e.cart.tax.included?e.m("taxIncludedTip"):e.m("taxExcludedTip"))+"</li><li>"+e.m("shippingFeeAndTaxTip")+"</li></ul></div></div>"};