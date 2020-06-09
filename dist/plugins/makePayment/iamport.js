(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Based on Iamport's JavaScript SDK.
 * - Iamport's JavaScript SDK should be imported before this plugin.
 * - `IMP.init('id');` should be called before `makePayment` gets called.
 * - Website: http://iamport.kr/
 * - Guide: https://docs.iamport.kr/
 */

var RedirectionError = function RedirectionError(options) {
	var code = options.code,
	    type = options.type,
	    subject = options.subject,
	    message = options.message;


	var err = new Error(message);

	err.code = code;
	err.type = type;
	err.subject = subject;

	return err;
};

var implementation = function implementation() {
	var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var _options$redirectURL = options.redirectURL,
	    redirectURL = _options$redirectURL === undefined ? function (data) {

		var location = window.location;
		var type = data.subscription ? 'subscription' : 'order';

		// `?type` query is required.
		return location.protocol + '//' + location.host + '?type=' + type;
	} : _options$redirectURL,
	    _options$billingKeyNa = options.billingKeyName,
	    billingKeyName = _options$billingKeyNa === undefined ? 'Billing Key' : _options$billingKeyNa,
	    _options$orderName = options.orderName,
	    orderName = _options$orderName === undefined ? function (cart) {
		return (cart.items[0].product.name || '').slice(0, 16);
	} : _options$orderName,
	    _options$buyerName = options.buyerName,
	    buyerName = _options$buyerName === undefined ? function (customer) {
		return customer.name.full;
	} : _options$buyerName,
	    _options$buyerAddress = options.buyerAddress,
	    buyerAddress = _options$buyerAddress === undefined ? function (address) {
		return [address.address1, address.address2].filter(function (v) {
			return v;
		}).join(' ').trim();
	} : _options$buyerAddress,
	    _options$redirectionC = options.redirectionCallback,
	    redirectionCallback = _options$redirectionC === undefined ? function (err, data) {

		if (err) {

			var message = Thunder.polyglot.t('checkout.paymentFailed');

			Thunder.notify('error', message + ' [' + err.code + ']');

			return Thunder.open(err.type + '-detail', _defineProperty({}, err.type, err.subject));
		}

		return Thunder.open('checkout-success', data);
	} : _options$redirectionC;


	Thunder.listeners.init.push(function () {
		// Handle mobile redirections automatically
		implementation.handleRedirect(redirectionCallback);
	});

	return function () {
		var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		var callback = arguments[1];
		var paymentMethod = data.paymentMethod,
		    cart = data.cart,
		    order = data.order,
		    subscription = data.subscription,
		    customer = data.customer;


		if (paymentMethod.cardFields) {
			// Since Iamport doesn't support manual payment with card information,
			// do not call `IMP.request_pay` method.
			return callback(null, {});
		}

		var subject = subscription || order;
		var address = subject.address.shipping;
		var currency = subject.currency.payment.code;

		var taxFree = cart ? implementation.calculateTaxFree(cart) : null;

		var pgId = paymentMethod.meta.pg.split('.')[0];

		// Default request options for orders and subscriptions
		var params = $.extend({
			pg: paymentMethod.meta.pg,
			pay_method: paymentMethod.meta.payMethod,
			currency: currency,
			buyer_email: customer.email || null,
			buyer_name: buyerName(customer),
			buyer_tel: customer.mobile || customer.phone, // Required by Iamport
			buyer_addr: buyerAddress(address),
			buyer_postcode: address.postcode,
			m_redirect_url: redirectURL(data) // Set redirect URL if is needed...
		}, subscription ? {
			// Subscription case, Issue a billing key for subscriptions.
			// Reference: https://github.com/iamport/iamport-manual/tree/master/%EB%B9%84%EC%9D%B8%EC%A6%9D%EA%B2%B0%EC%A0%9C/example
			merchant_uid: subscription._id, // Set `merchant_uid` as a subscription's id
			// Billing key will be issued..
			// For a registered customer: customer._id
			// For a non-registered customer: subscription._id
			customer_uid: subscription.customer._id || subscription._id,
			name: billingKeyName, // Placeholder name
			amount:
			// 정기 구독이면서 PG사가 이니시스인 경우,
			// 결제 금액 디스플레이를 위해 정기 구독의 1번째 스케쥴 결제 금액을 디스플레이
			// (단순 디스플레이용이며, 해당 금액과 관련해 실제 결제가 PG에 의해서 일어나지 않음)
			// Ref: https://github.com/iamport/iamport-manual/blob/master/%EB%B9%84%EC%9D%B8%EC%A6%9D%EA%B2%B0%EC%A0%9C/example/inicis-request-billing-key.md#2-%EB%B9%8C%EB%A7%81%ED%82%A4-%EB%B0%9C%EA%B8%89%EC%9D%84-%EC%9C%84%ED%95%9C-%EA%B2%B0%EC%A0%9C%EC%B0%BD-%ED%98%B8%EC%B6%9C
			pgId.indexOf('inicis') >= 0 ? typeof subscription.schedules[0].amount.raw === 'number' ? subscription.schedules[0].amount.raw : subscription.schedules[0].amount : 0
		} : $.extend({
			// Regular order case.
			merchant_uid: order._id,
			name: orderName(cart),
			// Handle rich data cases.
			amount: typeof order.total.amount.raw === 'number' ? order.total.amount.raw : order.total.amount
		}, taxFree ? {
			// `tax_free` param is only supported for regular orders for now.
			tax_free: taxFree
		} : {}));

		return IMP.request_pay(params, function (res) {
			return callback(res.success ? null : res, res);
		});
	};
};

implementation.calculateTaxFree = function (cart) {

	var isZeroTaxed = function isZeroTaxed(item) {
		return item.taxed.convertedRaw === 0;
	};

	// Handle `tax_free` parameter of Iamport for tax exempted & zero-rated products.
	// Reference: https://docs.iamport.kr/tech/vat
	var itemsWithZeroTax = [].concat(
	// Zero taxed items
	cart.items.reduce(function (items, item) {
		return items.concat(item, item.bundleItems || []);
	}, []).filter(isZeroTaxed).map(function (item) {
		return item.price.withTax.convertedRaw;
	}),
	// Zero taxed shipment
	(cart.shipments || []).filter(isZeroTaxed).map(function (shipment) {
		return shipment.fee.withTax.convertedRaw;
	})).filter(function (v) {
		return v !== 0;
	}); // Just in case where an actual item/shipment's price is 0

	if (itemsWithZeroTax.length === 0) {
		// There are no zero taxed items and shipments
		return null;
	}

	// Build a sum price of tax free items and shipments.
	// It is important that we use the payment currency's precision to calculate sum.
	// Reference: https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
	var precision = cart.currency.payment.precision;

	var sum = itemsWithZeroTax.reduce(function (sum, v) {
		return sum + v;
	}, 0);

	if (precision > 0) {
		sum = parseFloat(parseFloat(sum).toPrecision(precision));
	}

	return sum;
};

implementation.handleRedirect = function (callback) {

	var Thunder = window.Thunder;
	var query = Thunder.util.urlQuery();

	var types = {
		order: true,
		subscription: true
	};

	if (types[query.type] && query.merchant_uid) {
		var success = query.imp_success,
		    type = query.type,
		    subject = query.merchant_uid;

		// Payment failure case...

		if (success !== 'true') {

			return callback(RedirectionError({
				code: 'iamport-payment',
				message: 'Failed to make a payment.',
				type: type,
				subject: subject
			}));
		}

		// Payment success case...
		if (type === 'order') {
			// Regular order case
			return callback(null, { type: type, subject: subject });
		}

		// Subscription case, we should post schedules to Iamport via Clayful's API
		return Thunder.request({
			method: 'POST',
			url: '/v1/me/subscriptions/' + subject + '/scheduled',
			data: {}
		}).then(function () {
			// Scheduling succeeded...
			return callback(null, { type: type, subject: subject });
		}, function (err) {
			// Scheduling failed...
			return callback(RedirectionError({
				code: 'clayful-schedule',
				message: 'Failed to post schedules.',
				type: type,
				subject: subject
			}));
		});
	}
};

window.ThunderMakePaymentIamport = implementation;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJwbHVnaW5zL21ha2VQYXltZW50L2lhbXBvcnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FDQUE7Ozs7Ozs7O0FBUUEsSUFBTSxtQkFBbUIsU0FBbkIsZ0JBQW1CLFVBQVc7QUFBQSxLQUdsQyxJQUhrQyxHQU8vQixPQVArQixDQUdsQyxJQUhrQztBQUFBLEtBSWxDLElBSmtDLEdBTy9CLE9BUCtCLENBSWxDLElBSmtDO0FBQUEsS0FLbEMsT0FMa0MsR0FPL0IsT0FQK0IsQ0FLbEMsT0FMa0M7QUFBQSxLQU1sQyxPQU5rQyxHQU8vQixPQVArQixDQU1sQyxPQU5rQzs7O0FBU25DLEtBQU0sTUFBTSxJQUFJLEtBQUosQ0FBVSxPQUFWLENBQVo7O0FBRUEsS0FBSSxJQUFKLEdBQVcsSUFBWDtBQUNBLEtBQUksSUFBSixHQUFXLElBQVg7QUFDQSxLQUFJLE9BQUosR0FBYyxPQUFkOztBQUVBLFFBQU8sR0FBUDtBQUNBLENBaEJEOztBQWtCQSxJQUFNLGlCQUFpQixTQUFqQixjQUFpQixHQUFrQjtBQUFBLEtBQWpCLE9BQWlCLHVFQUFQLEVBQU87QUFBQSw0QkF1Q3BDLE9BdkNvQyxDQU12QyxXQU51QztBQUFBLEtBTXZDLFdBTnVDLHdDQU16QixnQkFBUTs7QUFFckIsTUFBTSxXQUFXLE9BQU8sUUFBeEI7QUFDQSxNQUFNLE9BQU8sS0FBSyxZQUFMLEdBQW9CLGNBQXBCLEdBQXFDLE9BQWxEOztBQUVBO0FBQ0EsU0FBVSxTQUFTLFFBQW5CLFVBQWdDLFNBQVMsSUFBekMsY0FBc0QsSUFBdEQ7QUFDQSxFQWJzQztBQUFBLDZCQXVDcEMsT0F2Q29DLENBZXZDLGNBZnVDO0FBQUEsS0FldkMsY0FmdUMseUNBZXRCLGFBZnNCO0FBQUEsMEJBdUNwQyxPQXZDb0MsQ0FpQnZDLFNBakJ1QztBQUFBLEtBaUJ2QyxTQWpCdUMsc0NBaUIzQjtBQUFBLFNBQVEsQ0FBQyxLQUFLLEtBQUwsQ0FBVyxDQUFYLEVBQWMsT0FBZCxDQUFzQixJQUF0QixJQUE4QixFQUEvQixFQUFtQyxLQUFuQyxDQUF5QyxDQUF6QyxFQUE0QyxFQUE1QyxDQUFSO0FBQUEsRUFqQjJCO0FBQUEsMEJBdUNwQyxPQXZDb0MsQ0FtQnZDLFNBbkJ1QztBQUFBLEtBbUJ2QyxTQW5CdUMsc0NBbUIzQjtBQUFBLFNBQVksU0FBUyxJQUFULENBQWMsSUFBMUI7QUFBQSxFQW5CMkI7QUFBQSw2QkF1Q3BDLE9BdkNvQyxDQXFCdkMsWUFyQnVDO0FBQUEsS0FxQnZDLFlBckJ1Qyx5Q0FxQnhCO0FBQUEsU0FBVyxDQUN6QixRQUFRLFFBRGlCLEVBRXpCLFFBQVEsUUFGaUIsRUFHeEIsTUFId0IsQ0FHakI7QUFBQSxVQUFLLENBQUw7QUFBQSxHQUhpQixFQUdULElBSFMsQ0FHSixHQUhJLEVBR0MsSUFIRCxFQUFYO0FBQUEsRUFyQndCO0FBQUEsNkJBdUNwQyxPQXZDb0MsQ0EwQnZDLG1CQTFCdUM7QUFBQSxLQTBCdkMsbUJBMUJ1Qyx5Q0EwQmpCLFVBQUMsR0FBRCxFQUFNLElBQU4sRUFBZTs7QUFFcEMsTUFBSSxHQUFKLEVBQVM7O0FBRVIsT0FBTSxVQUFVLFFBQVEsUUFBUixDQUFpQixDQUFqQixDQUFtQix3QkFBbkIsQ0FBaEI7O0FBRUEsV0FBUSxNQUFSLENBQWUsT0FBZixFQUE0QixPQUE1QixVQUEwQyxJQUFJLElBQTlDOztBQUVBLFVBQU8sUUFBUSxJQUFSLENBQWlCLElBQUksSUFBckIsa0NBQXdDLElBQUksSUFBNUMsRUFBbUQsSUFBSSxPQUF2RCxFQUFQO0FBQ0E7O0FBRUQsU0FBTyxRQUFRLElBQVIsQ0FBYSxrQkFBYixFQUFpQyxJQUFqQyxDQUFQO0FBQ0EsRUF0Q3NDOzs7QUF5Q3hDLFNBQVEsU0FBUixDQUFrQixJQUFsQixDQUF1QixJQUF2QixDQUE0QixZQUFNO0FBQ2pDO0FBQ0EsaUJBQWUsY0FBZixDQUE4QixtQkFBOUI7QUFDQSxFQUhEOztBQUtBLFFBQU8sWUFBeUI7QUFBQSxNQUF4QixJQUF3Qix1RUFBakIsRUFBaUI7QUFBQSxNQUFiLFFBQWE7QUFBQSxNQUc5QixhQUg4QixHQVEzQixJQVIyQixDQUc5QixhQUg4QjtBQUFBLE1BSTlCLElBSjhCLEdBUTNCLElBUjJCLENBSTlCLElBSjhCO0FBQUEsTUFLOUIsS0FMOEIsR0FRM0IsSUFSMkIsQ0FLOUIsS0FMOEI7QUFBQSxNQU05QixZQU44QixHQVEzQixJQVIyQixDQU05QixZQU44QjtBQUFBLE1BTzlCLFFBUDhCLEdBUTNCLElBUjJCLENBTzlCLFFBUDhCOzs7QUFVL0IsTUFBSSxjQUFjLFVBQWxCLEVBQThCO0FBQzdCO0FBQ0E7QUFDQSxVQUFPLFNBQVMsSUFBVCxFQUFlLEVBQWYsQ0FBUDtBQUNBOztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsS0FBaEM7QUFDQSxNQUFNLFVBQVUsUUFBUSxPQUFSLENBQWdCLFFBQWhDO0FBQ0EsTUFBTSxXQUFXLFFBQVEsUUFBUixDQUFpQixPQUFqQixDQUF5QixJQUExQzs7QUFFQSxNQUFNLFVBQVUsT0FBTyxlQUFlLGdCQUFmLENBQWdDLElBQWhDLENBQVAsR0FBK0MsSUFBL0Q7O0FBRUEsTUFBTSxPQUFPLGNBQWMsSUFBZCxDQUFtQixFQUFuQixDQUFzQixLQUF0QixDQUE0QixHQUE1QixFQUFpQyxDQUFqQyxDQUFiOztBQUVBO0FBQ0EsTUFBTSxTQUFTLEVBQUUsTUFBRixDQUFTO0FBQ3ZCLE9BQWdCLGNBQWMsSUFBZCxDQUFtQixFQURaO0FBRXZCLGVBQWdCLGNBQWMsSUFBZCxDQUFtQixTQUZaO0FBR3ZCLGFBQWdCLFFBSE87QUFJdkIsZ0JBQWdCLFNBQVMsS0FBVCxJQUFrQixJQUpYO0FBS3ZCLGVBQWdCLFVBQVUsUUFBVixDQUxPO0FBTXZCLGNBQWdCLFNBQVMsTUFBVCxJQUFtQixTQUFTLEtBTnJCLEVBTTRCO0FBQ25ELGVBQWdCLGFBQWEsT0FBYixDQVBPO0FBUXZCLG1CQUFnQixRQUFRLFFBUkQ7QUFTdkIsbUJBQWdCLFlBQVksSUFBWixDQVRPLENBU1c7QUFUWCxHQUFULEVBVVosZUFBZTtBQUNqQjtBQUNBO0FBQ0EsaUJBQWMsYUFBYSxHQUhWLEVBR2U7QUFDaEM7QUFDQTtBQUNBO0FBQ0EsaUJBQWMsYUFBYSxRQUFiLENBQXNCLEdBQXRCLElBQTZCLGFBQWEsR0FQdkM7QUFRakIsU0FBYyxjQVJHLEVBUWU7QUFDaEM7QUFDQztBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQUssT0FBTCxDQUFhLFFBQWIsS0FBMEIsQ0FBMUIsR0FFRSxPQUFPLGFBQWEsU0FBYixDQUF1QixDQUF2QixFQUEwQixNQUExQixDQUFpQyxHQUF4QyxLQUFnRCxRQUFoRCxHQUNDLGFBQWEsU0FBYixDQUF1QixDQUF2QixFQUEwQixNQUExQixDQUFpQyxHQURsQyxHQUVDLGFBQWEsU0FBYixDQUF1QixDQUF2QixFQUEwQixNQUo3QixHQUtLO0FBbkJXLEdBQWYsR0FxQkMsRUFBRSxNQUFGLENBQVM7QUFDWjtBQUNBLGlCQUFjLE1BQU0sR0FGUjtBQUdaLFNBQWMsVUFBVSxJQUFWLENBSEY7QUFJWjtBQUNBLFdBQWMsT0FBTyxNQUFNLEtBQU4sQ0FBWSxNQUFaLENBQW1CLEdBQTFCLEtBQWtDLFFBQWxDLEdBQ1YsTUFBTSxLQUFOLENBQVksTUFBWixDQUFtQixHQURULEdBRVYsTUFBTSxLQUFOLENBQVk7QUFQSixHQUFULEVBUUQsVUFBVTtBQUNaO0FBQ0EsYUFBVTtBQUZFLEdBQVYsR0FHQyxFQVhBLENBL0JXLENBQWY7O0FBNENBLFNBQU8sSUFBSSxXQUFKLENBQWdCLE1BQWhCLEVBQXdCLGVBQU87QUFDckMsVUFBTyxTQUFTLElBQUksT0FBSixHQUFjLElBQWQsR0FBcUIsR0FBOUIsRUFBbUMsR0FBbkMsQ0FBUDtBQUNBLEdBRk0sQ0FBUDtBQUlBLEVBekVEO0FBMkVBLENBekhEOztBQTJIQSxlQUFlLGdCQUFmLEdBQWtDLGdCQUFROztBQUV6QyxLQUFNLGNBQWMsU0FBZCxXQUFjO0FBQUEsU0FBUSxLQUFLLEtBQUwsQ0FBVyxZQUFYLEtBQTRCLENBQXBDO0FBQUEsRUFBcEI7O0FBRUE7QUFDQTtBQUNBLEtBQU0sbUJBQW1CLEdBQUcsTUFBSDtBQUN4QjtBQUNBLE1BQUssS0FBTCxDQUNFLE1BREYsQ0FDUyxVQUFDLEtBQUQsRUFBUSxJQUFSO0FBQUEsU0FBaUIsTUFBTSxNQUFOLENBQWEsSUFBYixFQUFtQixLQUFLLFdBQUwsSUFBb0IsRUFBdkMsQ0FBakI7QUFBQSxFQURULEVBQ3NFLEVBRHRFLEVBRUUsTUFGRixDQUVTLFdBRlQsRUFHRSxHQUhGLENBR007QUFBQSxTQUFRLEtBQUssS0FBTCxDQUFXLE9BQVgsQ0FBbUIsWUFBM0I7QUFBQSxFQUhOLENBRndCO0FBTXhCO0FBQ0EsRUFBQyxLQUFLLFNBQUwsSUFBa0IsRUFBbkIsRUFDRSxNQURGLENBQ1MsV0FEVCxFQUVFLEdBRkYsQ0FFTTtBQUFBLFNBQVksU0FBUyxHQUFULENBQWEsT0FBYixDQUFxQixZQUFqQztBQUFBLEVBRk4sQ0FQd0IsRUFVdkIsTUFWdUIsQ0FVaEI7QUFBQSxTQUFLLE1BQU0sQ0FBWDtBQUFBLEVBVmdCLENBQXpCLENBTnlDLENBZ0JqQjs7QUFFeEIsS0FBSSxpQkFBaUIsTUFBakIsS0FBNEIsQ0FBaEMsRUFBbUM7QUFDbEM7QUFDQSxTQUFPLElBQVA7QUFDQTs7QUFFRDtBQUNBO0FBQ0E7QUFDQSxLQUFNLFlBQVksS0FBSyxRQUFMLENBQWMsT0FBZCxDQUFzQixTQUF4Qzs7QUFFQSxLQUFJLE1BQU0saUJBQWlCLE1BQWpCLENBQXdCLFVBQUMsR0FBRCxFQUFNLENBQU47QUFBQSxTQUFZLE1BQU0sQ0FBbEI7QUFBQSxFQUF4QixFQUE2QyxDQUE3QyxDQUFWOztBQUVBLEtBQUksWUFBWSxDQUFoQixFQUFtQjtBQUNsQixRQUFNLFdBQVcsV0FBVyxHQUFYLEVBQWdCLFdBQWhCLENBQTRCLFNBQTVCLENBQVgsQ0FBTjtBQUNBOztBQUVELFFBQU8sR0FBUDtBQUVBLENBcENEOztBQXNDQSxlQUFlLGNBQWYsR0FBZ0Msb0JBQVk7O0FBRTNDLEtBQU0sVUFBVSxPQUFPLE9BQXZCO0FBQ0EsS0FBTSxRQUFRLFFBQVEsSUFBUixDQUFhLFFBQWIsRUFBZDs7QUFFQSxLQUFNLFFBQVE7QUFDYixTQUFjLElBREQ7QUFFYixnQkFBYztBQUZELEVBQWQ7O0FBS0EsS0FBSSxNQUFNLE1BQU0sSUFBWixLQUFxQixNQUFNLFlBQS9CLEVBQTZDO0FBQUEsTUFHN0IsT0FINkIsR0FNeEMsS0FOd0MsQ0FHM0MsV0FIMkM7QUFBQSxNQUk3QixJQUo2QixHQU14QyxLQU53QyxDQUkzQyxJQUoyQztBQUFBLE1BSzdCLE9BTDZCLEdBTXhDLEtBTndDLENBSzNDLFlBTDJDOztBQVE1Qzs7QUFDQSxNQUFJLFlBQVksTUFBaEIsRUFBd0I7O0FBRXZCLFVBQU8sU0FBUyxpQkFBaUI7QUFDaEMsVUFBUyxpQkFEdUI7QUFFaEMsYUFBUywyQkFGdUI7QUFHaEMsVUFBUyxJQUh1QjtBQUloQyxhQUFTO0FBSnVCLElBQWpCLENBQVQsQ0FBUDtBQU1BOztBQUVEO0FBQ0EsTUFBSSxTQUFTLE9BQWIsRUFBc0I7QUFDckI7QUFDQSxVQUFPLFNBQVMsSUFBVCxFQUFlLEVBQUUsVUFBRixFQUFRLGdCQUFSLEVBQWYsQ0FBUDtBQUNBOztBQUVEO0FBQ0EsU0FBTyxRQUFRLE9BQVIsQ0FBZ0I7QUFDdEIsV0FBUSxNQURjO0FBRXRCLGtDQUFnQyxPQUFoQyxlQUZzQjtBQUd0QixTQUFRO0FBSGMsR0FBaEIsRUFJSixJQUpJLENBSUMsWUFBTTtBQUNiO0FBQ0EsVUFBTyxTQUFTLElBQVQsRUFBZSxFQUFFLFVBQUYsRUFBUSxnQkFBUixFQUFmLENBQVA7QUFDQSxHQVBNLEVBT0osZUFBTztBQUNUO0FBQ0EsVUFBTyxTQUFTLGlCQUFpQjtBQUNoQyxVQUFTLGtCQUR1QjtBQUVoQyxhQUFTLDJCQUZ1QjtBQUdoQyxVQUFTLElBSHVCO0FBSWhDLGFBQVM7QUFKdUIsSUFBakIsQ0FBVCxDQUFQO0FBTUEsR0FmTSxDQUFQO0FBaUJBO0FBRUQsQ0F2REQ7O0FBeURBLE9BQU8seUJBQVAsR0FBbUMsY0FBbkMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKipcclxuICogQmFzZWQgb24gSWFtcG9ydCdzIEphdmFTY3JpcHQgU0RLLlxyXG4gKiAtIElhbXBvcnQncyBKYXZhU2NyaXB0IFNESyBzaG91bGQgYmUgaW1wb3J0ZWQgYmVmb3JlIHRoaXMgcGx1Z2luLlxyXG4gKiAtIGBJTVAuaW5pdCgnaWQnKTtgIHNob3VsZCBiZSBjYWxsZWQgYmVmb3JlIGBtYWtlUGF5bWVudGAgZ2V0cyBjYWxsZWQuXHJcbiAqIC0gV2Vic2l0ZTogaHR0cDovL2lhbXBvcnQua3IvXHJcbiAqIC0gR3VpZGU6IGh0dHBzOi8vZG9jcy5pYW1wb3J0LmtyL1xyXG4gKi9cclxuXHJcbmNvbnN0IFJlZGlyZWN0aW9uRXJyb3IgPSBvcHRpb25zID0+IHtcclxuXHJcblx0Y29uc3Qge1xyXG5cdFx0Y29kZSxcclxuXHRcdHR5cGUsXHJcblx0XHRzdWJqZWN0LFxyXG5cdFx0bWVzc2FnZVxyXG5cdH0gPSBvcHRpb25zO1xyXG5cclxuXHRjb25zdCBlcnIgPSBuZXcgRXJyb3IobWVzc2FnZSk7XHJcblxyXG5cdGVyci5jb2RlID0gY29kZTtcclxuXHRlcnIudHlwZSA9IHR5cGU7XHJcblx0ZXJyLnN1YmplY3QgPSBzdWJqZWN0O1xyXG5cclxuXHRyZXR1cm4gZXJyO1xyXG59O1xyXG5cclxuY29uc3QgaW1wbGVtZW50YXRpb24gPSAob3B0aW9ucyA9IHt9KSA9PiB7XHJcblxyXG5cdGNvbnN0IHtcclxuXHRcdC8vIFNldCByZWRpcmVjdGlvbiBVUkwgZm9yIG1vYmlsZSBwYXltZW50cyAoSWYgaXQncyBuZWNlc3NhcnkpLlxyXG5cdFx0Ly8gRGVmYXVsdCB2YWx1ZSBpcyB0aGUgcm9vdCBVUkwgb2YgdGhlIHdlYnNpdGUuXHJcblx0XHQvLyBSZWZlcmVuY2U6IGh0dHBzOi8vZG9jcy5pYW1wb3J0LmtyL2ltcGxlbWVudGF0aW9uL3BheW1lbnQjbW9iaWxlLXdlYi0xXHJcblx0XHRyZWRpcmVjdFVSTCA9IGRhdGEgPT4ge1xyXG5cclxuXHRcdFx0Y29uc3QgbG9jYXRpb24gPSB3aW5kb3cubG9jYXRpb247XHJcblx0XHRcdGNvbnN0IHR5cGUgPSBkYXRhLnN1YnNjcmlwdGlvbiA/ICdzdWJzY3JpcHRpb24nIDogJ29yZGVyJztcclxuXHJcblx0XHRcdC8vIGA/dHlwZWAgcXVlcnkgaXMgcmVxdWlyZWQuXHJcblx0XHRcdHJldHVybiBgJHtsb2NhdGlvbi5wcm90b2NvbH0vLyR7bG9jYXRpb24uaG9zdH0/dHlwZT0ke3R5cGV9YDtcclxuXHRcdH0sXHJcblx0XHQvLyBCaWxsaW5nIGtleSBuYW1lIHBsYWNlaG9sZGVyLlxyXG5cdFx0YmlsbGluZ0tleU5hbWUgPSAnQmlsbGluZyBLZXknLFxyXG5cdFx0Ly8gT3JkZXIgbmFtZSBnZXR0ZXIuIFJlY29tbWVuZGVkIG1heCBsZW5ndGggLT4gMTZcclxuXHRcdG9yZGVyTmFtZSA9IGNhcnQgPT4gKGNhcnQuaXRlbXNbMF0ucHJvZHVjdC5uYW1lIHx8ICcnKS5zbGljZSgwLCAxNiksXHJcblx0XHQvLyBDdXN0b21lciBuYW1lIGdldHRlci5cclxuXHRcdGJ1eWVyTmFtZSA9IGN1c3RvbWVyID0+IGN1c3RvbWVyLm5hbWUuZnVsbCxcclxuXHRcdC8vIEFkZHJlc3MgZ2V0dGVyLlxyXG5cdFx0YnV5ZXJBZGRyZXNzID0gYWRkcmVzcyA9PiBbXHJcblx0XHRcdGFkZHJlc3MuYWRkcmVzczEsXHJcblx0XHRcdGFkZHJlc3MuYWRkcmVzczJcclxuXHRcdF0uZmlsdGVyKHYgPT4gdikuam9pbignICcpLnRyaW0oKSxcclxuXHRcdC8vIE1vYmlsZSBwYXltZW50IHJlZGlyZWN0aW9uIGhhbmRsZXIuXHJcblx0XHRyZWRpcmVjdGlvbkNhbGxiYWNrID0gKGVyciwgZGF0YSkgPT4ge1xyXG5cclxuXHRcdFx0aWYgKGVycikge1xyXG5cclxuXHRcdFx0XHRjb25zdCBtZXNzYWdlID0gVGh1bmRlci5wb2x5Z2xvdC50KCdjaGVja291dC5wYXltZW50RmFpbGVkJyk7XHJcblxyXG5cdFx0XHRcdFRodW5kZXIubm90aWZ5KCdlcnJvcicsIGAkeyBtZXNzYWdlIH0gWyR7IGVyci5jb2RlIH1dYCk7XHJcblxyXG5cdFx0XHRcdHJldHVybiBUaHVuZGVyLm9wZW4oYCR7IGVyci50eXBlIH0tZGV0YWlsYCwgeyBbZXJyLnR5cGVdOiBlcnIuc3ViamVjdCB9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIFRodW5kZXIub3BlbignY2hlY2tvdXQtc3VjY2VzcycsIGRhdGEpO1xyXG5cdFx0fVxyXG5cdH0gPSBvcHRpb25zO1xyXG5cclxuXHRUaHVuZGVyLmxpc3RlbmVycy5pbml0LnB1c2goKCkgPT4ge1xyXG5cdFx0Ly8gSGFuZGxlIG1vYmlsZSByZWRpcmVjdGlvbnMgYXV0b21hdGljYWxseVxyXG5cdFx0aW1wbGVtZW50YXRpb24uaGFuZGxlUmVkaXJlY3QocmVkaXJlY3Rpb25DYWxsYmFjayk7XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiAoZGF0YSA9IHt9LCBjYWxsYmFjaykgPT4ge1xyXG5cclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0cGF5bWVudE1ldGhvZCxcclxuXHRcdFx0Y2FydCxcclxuXHRcdFx0b3JkZXIsXHJcblx0XHRcdHN1YnNjcmlwdGlvbixcclxuXHRcdFx0Y3VzdG9tZXIsXHJcblx0XHR9ID0gZGF0YTtcclxuXHJcblx0XHRpZiAocGF5bWVudE1ldGhvZC5jYXJkRmllbGRzKSB7XHJcblx0XHRcdC8vIFNpbmNlIElhbXBvcnQgZG9lc24ndCBzdXBwb3J0IG1hbnVhbCBwYXltZW50IHdpdGggY2FyZCBpbmZvcm1hdGlvbixcclxuXHRcdFx0Ly8gZG8gbm90IGNhbGwgYElNUC5yZXF1ZXN0X3BheWAgbWV0aG9kLlxyXG5cdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwge30pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN1YmplY3QgPSBzdWJzY3JpcHRpb24gfHwgb3JkZXI7XHJcblx0XHRjb25zdCBhZGRyZXNzID0gc3ViamVjdC5hZGRyZXNzLnNoaXBwaW5nO1xyXG5cdFx0Y29uc3QgY3VycmVuY3kgPSBzdWJqZWN0LmN1cnJlbmN5LnBheW1lbnQuY29kZTtcclxuXHJcblx0XHRjb25zdCB0YXhGcmVlID0gY2FydCA/IGltcGxlbWVudGF0aW9uLmNhbGN1bGF0ZVRheEZyZWUoY2FydCkgOiBudWxsO1xyXG5cclxuXHRcdGNvbnN0IHBnSWQgPSBwYXltZW50TWV0aG9kLm1ldGEucGcuc3BsaXQoJy4nKVswXTtcclxuXHJcblx0XHQvLyBEZWZhdWx0IHJlcXVlc3Qgb3B0aW9ucyBmb3Igb3JkZXJzIGFuZCBzdWJzY3JpcHRpb25zXHJcblx0XHRjb25zdCBwYXJhbXMgPSAkLmV4dGVuZCh7XHJcblx0XHRcdHBnOiAgICAgICAgICAgICBwYXltZW50TWV0aG9kLm1ldGEucGcsXHJcblx0XHRcdHBheV9tZXRob2Q6ICAgICBwYXltZW50TWV0aG9kLm1ldGEucGF5TWV0aG9kLFxyXG5cdFx0XHRjdXJyZW5jeTogICAgICAgY3VycmVuY3ksXHJcblx0XHRcdGJ1eWVyX2VtYWlsOiAgICBjdXN0b21lci5lbWFpbCB8fCBudWxsLFxyXG5cdFx0XHRidXllcl9uYW1lOiAgICAgYnV5ZXJOYW1lKGN1c3RvbWVyKSxcclxuXHRcdFx0YnV5ZXJfdGVsOiAgICAgIGN1c3RvbWVyLm1vYmlsZSB8fCBjdXN0b21lci5waG9uZSwgLy8gUmVxdWlyZWQgYnkgSWFtcG9ydFxyXG5cdFx0XHRidXllcl9hZGRyOiAgICAgYnV5ZXJBZGRyZXNzKGFkZHJlc3MpLFxyXG5cdFx0XHRidXllcl9wb3N0Y29kZTogYWRkcmVzcy5wb3N0Y29kZSxcclxuXHRcdFx0bV9yZWRpcmVjdF91cmw6IHJlZGlyZWN0VVJMKGRhdGEpIC8vIFNldCByZWRpcmVjdCBVUkwgaWYgaXMgbmVlZGVkLi4uXHJcblx0XHR9LCBzdWJzY3JpcHRpb24gPyB7XHJcblx0XHRcdC8vIFN1YnNjcmlwdGlvbiBjYXNlLCBJc3N1ZSBhIGJpbGxpbmcga2V5IGZvciBzdWJzY3JpcHRpb25zLlxyXG5cdFx0XHQvLyBSZWZlcmVuY2U6IGh0dHBzOi8vZ2l0aHViLmNvbS9pYW1wb3J0L2lhbXBvcnQtbWFudWFsL3RyZWUvbWFzdGVyLyVFQiVCOSU4NCVFQyU5RCVCOCVFQyVBNiU5RCVFQSVCMiVCMCVFQyVBMCU5Qy9leGFtcGxlXHJcblx0XHRcdG1lcmNoYW50X3VpZDogc3Vic2NyaXB0aW9uLl9pZCwgLy8gU2V0IGBtZXJjaGFudF91aWRgIGFzIGEgc3Vic2NyaXB0aW9uJ3MgaWRcclxuXHRcdFx0Ly8gQmlsbGluZyBrZXkgd2lsbCBiZSBpc3N1ZWQuLlxyXG5cdFx0XHQvLyBGb3IgYSByZWdpc3RlcmVkIGN1c3RvbWVyOiBjdXN0b21lci5faWRcclxuXHRcdFx0Ly8gRm9yIGEgbm9uLXJlZ2lzdGVyZWQgY3VzdG9tZXI6IHN1YnNjcmlwdGlvbi5faWRcclxuXHRcdFx0Y3VzdG9tZXJfdWlkOiBzdWJzY3JpcHRpb24uY3VzdG9tZXIuX2lkIHx8IHN1YnNjcmlwdGlvbi5faWQsXHJcblx0XHRcdG5hbWU6ICAgICAgICAgYmlsbGluZ0tleU5hbWUsICAgLy8gUGxhY2Vob2xkZXIgbmFtZVxyXG5cdFx0XHRhbW91bnQ6ICAgICAgIChcclxuXHRcdFx0XHQvLyDsoJXquLAg6rWs64+F7J2066m07IScIFBH7IKs6rCAIOydtOuLiOyLnOyKpOyduCDqsr3smrAsXHJcblx0XHRcdFx0Ly8g6rKw7KCcIOq4iOyVoSDrlJTsiqTtlIzroIjsnbTrpbwg7JyE7ZW0IOygleq4sCDqtazrj4XsnZggMeuyiOynuCDsiqTsvIDspbQg6rKw7KCcIOq4iOyVoeydhCDrlJTsiqTtlIzroIjsnbRcclxuXHRcdFx0XHQvLyAo64uo7IicIOuUlOyKpO2UjOugiOydtOyaqeydtOupsCwg7ZW064u5IOq4iOyVoeqzvCDqtIDroKjtlbQg7Iuk7KCcIOqysOygnOqwgCBQR+yXkCDsnZjtlbTshJwg7J287Ja064KY7KeAIOyViuydjClcclxuXHRcdFx0XHQvLyBSZWY6IGh0dHBzOi8vZ2l0aHViLmNvbS9pYW1wb3J0L2lhbXBvcnQtbWFudWFsL2Jsb2IvbWFzdGVyLyVFQiVCOSU4NCVFQyU5RCVCOCVFQyVBNiU5RCVFQSVCMiVCMCVFQyVBMCU5Qy9leGFtcGxlL2luaWNpcy1yZXF1ZXN0LWJpbGxpbmcta2V5Lm1kIzItJUVCJUI5JThDJUVCJUE3JTgxJUVEJTgyJUE0LSVFQiVCMCU5QyVFQSVCOCU4OSVFQyU5RCU4NC0lRUMlOUMlODQlRUQlOTUlOUMtJUVBJUIyJUIwJUVDJUEwJTlDJUVDJUIwJUJELSVFRCU5OCVCOCVFQyVCNiU5Q1xyXG5cdFx0XHRcdHBnSWQuaW5kZXhPZignaW5pY2lzJykgPj0gMCA/XHJcblx0XHRcdFx0XHQoXHJcblx0XHRcdFx0XHRcdHR5cGVvZiBzdWJzY3JpcHRpb24uc2NoZWR1bGVzWzBdLmFtb3VudC5yYXcgPT09ICdudW1iZXInID9cclxuXHRcdFx0XHRcdFx0XHRzdWJzY3JpcHRpb24uc2NoZWR1bGVzWzBdLmFtb3VudC5yYXcgOlxyXG5cdFx0XHRcdFx0XHRcdHN1YnNjcmlwdGlvbi5zY2hlZHVsZXNbMF0uYW1vdW50XHJcblx0XHRcdFx0XHQpIDogMFxyXG5cdFx0XHQpLFxyXG5cdFx0fSA6ICQuZXh0ZW5kKHtcclxuXHRcdFx0Ly8gUmVndWxhciBvcmRlciBjYXNlLlxyXG5cdFx0XHRtZXJjaGFudF91aWQ6IG9yZGVyLl9pZCxcclxuXHRcdFx0bmFtZTogICAgICAgICBvcmRlck5hbWUoY2FydCksXHJcblx0XHRcdC8vIEhhbmRsZSByaWNoIGRhdGEgY2FzZXMuXHJcblx0XHRcdGFtb3VudDogICAgICAgdHlwZW9mIG9yZGVyLnRvdGFsLmFtb3VudC5yYXcgPT09ICdudW1iZXInID9cclxuXHRcdFx0XHRcdFx0XHRvcmRlci50b3RhbC5hbW91bnQucmF3IDpcclxuXHRcdFx0XHRcdFx0XHRvcmRlci50b3RhbC5hbW91bnQsXHJcblx0XHR9LCB0YXhGcmVlID8ge1xyXG5cdFx0XHQvLyBgdGF4X2ZyZWVgIHBhcmFtIGlzIG9ubHkgc3VwcG9ydGVkIGZvciByZWd1bGFyIG9yZGVycyBmb3Igbm93LlxyXG5cdFx0XHR0YXhfZnJlZTogdGF4RnJlZVxyXG5cdFx0fSA6IHt9KSk7XHJcblxyXG5cdFx0cmV0dXJuIElNUC5yZXF1ZXN0X3BheShwYXJhbXMsIHJlcyA9PiB7XHJcblx0XHRcdHJldHVybiBjYWxsYmFjayhyZXMuc3VjY2VzcyA/IG51bGwgOiByZXMsIHJlcyk7XHJcblx0XHR9KTtcclxuXHJcblx0fTtcclxuXHJcbn07XHJcblxyXG5pbXBsZW1lbnRhdGlvbi5jYWxjdWxhdGVUYXhGcmVlID0gY2FydCA9PiB7XHJcblxyXG5cdGNvbnN0IGlzWmVyb1RheGVkID0gaXRlbSA9PiBpdGVtLnRheGVkLmNvbnZlcnRlZFJhdyA9PT0gMDtcclxuXHJcblx0Ly8gSGFuZGxlIGB0YXhfZnJlZWAgcGFyYW1ldGVyIG9mIElhbXBvcnQgZm9yIHRheCBleGVtcHRlZCAmIHplcm8tcmF0ZWQgcHJvZHVjdHMuXHJcblx0Ly8gUmVmZXJlbmNlOiBodHRwczovL2RvY3MuaWFtcG9ydC5rci90ZWNoL3ZhdFxyXG5cdGNvbnN0IGl0ZW1zV2l0aFplcm9UYXggPSBbXS5jb25jYXQoXHJcblx0XHQvLyBaZXJvIHRheGVkIGl0ZW1zXHJcblx0XHRjYXJ0Lml0ZW1zXHJcblx0XHRcdC5yZWR1Y2UoKGl0ZW1zLCBpdGVtKSA9PiBpdGVtcy5jb25jYXQoaXRlbSwgaXRlbS5idW5kbGVJdGVtcyB8fCBbXSksIFtdKVxyXG5cdFx0XHQuZmlsdGVyKGlzWmVyb1RheGVkKVxyXG5cdFx0XHQubWFwKGl0ZW0gPT4gaXRlbS5wcmljZS53aXRoVGF4LmNvbnZlcnRlZFJhdyksXHJcblx0XHQvLyBaZXJvIHRheGVkIHNoaXBtZW50XHJcblx0XHQoY2FydC5zaGlwbWVudHMgfHwgW10pXHJcblx0XHRcdC5maWx0ZXIoaXNaZXJvVGF4ZWQpXHJcblx0XHRcdC5tYXAoc2hpcG1lbnQgPT4gc2hpcG1lbnQuZmVlLndpdGhUYXguY29udmVydGVkUmF3KVxyXG5cdCkuZmlsdGVyKHYgPT4gdiAhPT0gMCk7IC8vIEp1c3QgaW4gY2FzZSB3aGVyZSBhbiBhY3R1YWwgaXRlbS9zaGlwbWVudCdzIHByaWNlIGlzIDBcclxuXHJcblx0aWYgKGl0ZW1zV2l0aFplcm9UYXgubGVuZ3RoID09PSAwKSB7XHJcblx0XHQvLyBUaGVyZSBhcmUgbm8gemVybyB0YXhlZCBpdGVtcyBhbmQgc2hpcG1lbnRzXHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8vIEJ1aWxkIGEgc3VtIHByaWNlIG9mIHRheCBmcmVlIGl0ZW1zIGFuZCBzaGlwbWVudHMuXHJcblx0Ly8gSXQgaXMgaW1wb3J0YW50IHRoYXQgd2UgdXNlIHRoZSBwYXltZW50IGN1cnJlbmN5J3MgcHJlY2lzaW9uIHRvIGNhbGN1bGF0ZSBzdW0uXHJcblx0Ly8gUmVmZXJlbmNlOiBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNDU4NjMzL2hvdy10by1kZWFsLXdpdGgtZmxvYXRpbmctcG9pbnQtbnVtYmVyLXByZWNpc2lvbi1pbi1qYXZhc2NyaXB0XHJcblx0Y29uc3QgcHJlY2lzaW9uID0gY2FydC5jdXJyZW5jeS5wYXltZW50LnByZWNpc2lvbjtcclxuXHJcblx0bGV0IHN1bSA9IGl0ZW1zV2l0aFplcm9UYXgucmVkdWNlKChzdW0sIHYpID0+IHN1bSArIHYsIDApO1xyXG5cclxuXHRpZiAocHJlY2lzaW9uID4gMCkge1xyXG5cdFx0c3VtID0gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHN1bSkudG9QcmVjaXNpb24ocHJlY2lzaW9uKSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gc3VtO1xyXG5cclxufTtcclxuXHJcbmltcGxlbWVudGF0aW9uLmhhbmRsZVJlZGlyZWN0ID0gY2FsbGJhY2sgPT4ge1xyXG5cclxuXHRjb25zdCBUaHVuZGVyID0gd2luZG93LlRodW5kZXI7XHJcblx0Y29uc3QgcXVlcnkgPSBUaHVuZGVyLnV0aWwudXJsUXVlcnkoKTtcclxuXHJcblx0Y29uc3QgdHlwZXMgPSB7XHJcblx0XHRvcmRlcjogICAgICAgIHRydWUsXHJcblx0XHRzdWJzY3JpcHRpb246IHRydWUsXHJcblx0fTtcclxuXHJcblx0aWYgKHR5cGVzW3F1ZXJ5LnR5cGVdICYmIHF1ZXJ5Lm1lcmNoYW50X3VpZCkge1xyXG5cclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0aW1wX3N1Y2Nlc3M6ICBzdWNjZXNzLFxyXG5cdFx0XHR0eXBlOiAgICAgICAgIHR5cGUsXHJcblx0XHRcdG1lcmNoYW50X3VpZDogc3ViamVjdFxyXG5cdFx0fSA9IHF1ZXJ5O1xyXG5cclxuXHRcdC8vIFBheW1lbnQgZmFpbHVyZSBjYXNlLi4uXHJcblx0XHRpZiAoc3VjY2VzcyAhPT0gJ3RydWUnKSB7XHJcblxyXG5cdFx0XHRyZXR1cm4gY2FsbGJhY2soUmVkaXJlY3Rpb25FcnJvcih7XHJcblx0XHRcdFx0Y29kZTogICAgJ2lhbXBvcnQtcGF5bWVudCcsXHJcblx0XHRcdFx0bWVzc2FnZTogJ0ZhaWxlZCB0byBtYWtlIGEgcGF5bWVudC4nLFxyXG5cdFx0XHRcdHR5cGU6ICAgIHR5cGUsXHJcblx0XHRcdFx0c3ViamVjdDogc3ViamVjdFxyXG5cdFx0XHR9KSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUGF5bWVudCBzdWNjZXNzIGNhc2UuLi5cclxuXHRcdGlmICh0eXBlID09PSAnb3JkZXInKSB7XHJcblx0XHRcdC8vIFJlZ3VsYXIgb3JkZXIgY2FzZVxyXG5cdFx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgeyB0eXBlLCBzdWJqZWN0IH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFN1YnNjcmlwdGlvbiBjYXNlLCB3ZSBzaG91bGQgcG9zdCBzY2hlZHVsZXMgdG8gSWFtcG9ydCB2aWEgQ2xheWZ1bCdzIEFQSVxyXG5cdFx0cmV0dXJuIFRodW5kZXIucmVxdWVzdCh7XHJcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxyXG5cdFx0XHR1cmw6ICAgIGAvdjEvbWUvc3Vic2NyaXB0aW9ucy8ke3N1YmplY3R9L3NjaGVkdWxlZGAsXHJcblx0XHRcdGRhdGE6ICAge30sXHJcblx0XHR9KS50aGVuKCgpID0+IHtcclxuXHRcdFx0Ly8gU2NoZWR1bGluZyBzdWNjZWVkZWQuLi5cclxuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHsgdHlwZSwgc3ViamVjdCB9KTtcclxuXHRcdH0sIGVyciA9PiB7XHJcblx0XHRcdC8vIFNjaGVkdWxpbmcgZmFpbGVkLi4uXHJcblx0XHRcdHJldHVybiBjYWxsYmFjayhSZWRpcmVjdGlvbkVycm9yKHtcclxuXHRcdFx0XHRjb2RlOiAgICAnY2xheWZ1bC1zY2hlZHVsZScsXHJcblx0XHRcdFx0bWVzc2FnZTogJ0ZhaWxlZCB0byBwb3N0IHNjaGVkdWxlcy4nLFxyXG5cdFx0XHRcdHR5cGU6ICAgIHR5cGUsXHJcblx0XHRcdFx0c3ViamVjdDogc3ViamVjdFxyXG5cdFx0XHR9KSk7XHJcblx0XHR9KTtcclxuXHJcblx0fVxyXG5cclxufTtcclxuXHJcbndpbmRvdy5UaHVuZGVyTWFrZVBheW1lbnRJYW1wb3J0ID0gaW1wbGVtZW50YXRpb247Il19
