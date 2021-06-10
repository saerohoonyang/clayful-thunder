module.exports = Thunder => {

	const implementation = {
		name: 'product-list'
	};

	implementation.options = () => ({
		page:        1,            // Which page of products?
		limit:       24,           // How many products at once?
		sort:        '-createdAt', // Default sort order
		fields:      '',           // Additional fields
		columns:     4,            // How many columns? (css supports for 1-12)
		filter:      '',           // Extra filters. e.g., brand=abcd
		labels:      Thunder.options.productLabels, // Product labels (unavailable, sold-out, discounted)
		imageWidth:  240,          // Image width
		imageHeight: 240,          // Image height
		showSummary: true,         // Show `product.summary`
		showRating:  (             // Show `product.rating`
			Thunder.options.productReview &&
			Thunder.options.productReviewRating
		),
		showComparePrice: true,  // Show `product.price.original`
        showCartButton:     true,   // Show an add to cart button
		usePagination:    true,  // Use pagination?
        onItemAdd: function($container, context) {
            return Thunder.notify('success', context.m('itemAddSuccess'));
        },
		onViewProduct: function($container, context, productId) {
			return Thunder.open('product-detail', {
				product: productId
			});
		}
	});

	implementation.pre = function(context, callback) {

		const options = context.options;

		const query = $.extend({
			bundled: false // Only display root products
		}, Thunder.util.parseQueryString(options.filter));

		const listQuery = $.extend({
			fields: [
				'thumbnail',
				'slug',
				'name',
				'summary',
				'price',
				'discount',
				'rating',
				'available',
				'variants.available',
				'variants.quantity'
			]
			.concat(Thunder.util.parseArrayString(options.fields))
			.join(','),
			page:   options.page,   // Page option
			limit:  options.limit,  // Limit option
			sort:   options.sort,   // Sort option
		}, query);

		const countQuery = $.extend({
			raw: true,
		}, query);

		const errors = {
			default: context.m('productListFailed')
		};

		const labels = Thunder.util.parseArrayString(options.labels).map(label => {
			return {
				label: label,
				check: ({
					unavailable: product => (
						!product.available ||
						product.variants.every(v => !v.available)
					),
					'sold-out': product => product.variants.every(v => {
						return v.quantity && v.quantity.raw === 0;
					}),
					discounted: product => !!product.discount.type,
				})[label]
			};
		}, {});

		return $.when(...[
			Thunder.request({
				method: 'GET',
				url:    '/v1/products',
				query:  listQuery,
			}),
			context.options.usePagination ? Thunder.request({
				method: 'GET',
				url:    '/v1/products/count',
				query:  countQuery,
			}) : null
		]).then((products, count) => {

			context.count = count ? count[0].count : null;
			context.products = products[0].map(product => {

				product.label = (
					labels.find(({ check }) => check(product)) ||
					{ label: null }
				).label;

				return product;
			});

			return callback(null, context);

		}, err => Thunder.util.requestErrorHandler(
			err.responseJSON,
			errors,
			callback
		));
	};

	implementation.init = function(context) {

		const $container = $(this);
		const $product = $(this).find('.thunder--product');
        const $addToCart = $(this).find('.thunder--add-to-cart');
		const $pagination = $(this).find('.thunder--product-list-pagination');

        const addToCartSpinner = Thunder.util.makeAsyncButton($addToCart);

        $product.on('click', [
			'.thunder--product-thumbnail-wrapper',
			'.thunder--product-name',
			'.thunder--product-summary',
		].join(','), event => Thunder.execute(
			context.options.onViewProduct,
			$container,
			context,
			$(event.delegateTarget).data('product')
		));

        $addToCart.on('click', () => addToCart());

        if (context.options.usePagination) {

			Thunder.plugins.pagination({
				container:     $pagination,
				currentPage:   context.options.page,
				totalResult:   context.count,
				resultPerPage: context.options.limit,
				onPageChange:  ({ page }) => Thunder.render(
					$container,
					implementation.name,
					$.extend(context.options, { page })
				)
			});
		}

        function addToCart(success) {
            const item = buildItemData();

            success = success || (() => {

                Thunder.execute(
                    context.options.onItemAdd,
                    $container,
                    context
                );

            });

            const errors = {
                'items-exceeded': context.m('itemsExceeded'),
                default:          context.m('itemAddFailed'),
            };

            return Thunder.request({
                method: 'POST',
                url:    '/v1/customers/VY6BEFBJX7RU/cart/items',
                data:   item
            }).then(item => {
                addToCartSpinner.done();
                return success(item);
            }, err => console.log("Error"));

            // Thunder.Cart.addItem(item, err => {
            //
            //     if (err) {
            //         addToCartSpinner.done();
            //         return Thunder.notify('error', errors[err.code || 'default'] || errors.default);
            //     }
            //
            //     addToCartSpinner.done();
            //     return success(item);
            // });

            // if (Thunder.authenticated()) {
            //
            //     return Thunder.request({
            //         method: 'POST',
            //         url:    '/v1/me/cart/items',
            //         data:   item
            //     }).then(item => {
            //         addToCartSpinner.done();
            //         return success(item);
            //     }, err => console.log("Error"));
            //
            // } else {
            //
            //     Thunder.Cart.addItem(item, err => {
            //
            //         if (err) {
            //             addToCartSpinner.done();
            //             return Thunder.notify('error', errors[err.code || 'default'] || errors.default);
            //         }
            //
            //         addToCartSpinner.done();
            //         return success(item);
            //     });
            // }
        }

        function buildItemData() {

            const shippingMethod = '2J4JDYZBJ9H9';
            const bundleItems = [];

            const itemQuantity = 1;
            const variant = null;

            return {
                product:        $product._id,
                variant:        variant,
                shippingMethod: shippingMethod,
                quantity:       itemQuantity ? parseInt(itemQuantity) : null,
                bundleItems:    bundleItems
            };

        }

	};

	return implementation;

};