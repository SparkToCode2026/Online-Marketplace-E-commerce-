let cartId = localStorage.getItem("cartId");

document.addEventListener("DOMContentLoaded", () => {
    loadCart();

    document
        .getElementById("clearCartBtn")
        .addEventListener("click", clearCart);

    document
        .getElementById("checkoutBtn")
        .addEventListener("click", goToCheckout);
});

async function loadCart() {
    if (!cartId) {
        showError("Cart ID was not found.");
        return;
    }

    showLoading();

    try {
        const response = await apiFetch(
            `/Cart/getById?id=${cartId}`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load cart.");
        }

        const cart = await response.json();

        renderCart(cart);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

function renderCart(cart) {
    const container = document.getElementById("cartItems");
    const totalElement = document.getElementById("cartTotal");

    container.innerHTML = "";

    let total = 0;

    if (!cart.cartItems || cart.cartItems.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    Cart is empty.
                </td>
            </tr>
        `;

        totalElement.textContent = "0.00";
        return;
    }

    cart.cartItems.forEach(item => {
        if (!item.product) {
            return;
        }

        const product = item.product;
        const lineTotal =
            Number(product.price) * Number(item.quantity);

        total += lineTotal;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${product.name}</td>

            <td>
                ${Number(product.price).toFixed(2)}
            </td>

            <td>
                <input
                    type="number"
                    class="form-control quantity-input"
                    value="${item.quantity}"
                    min="1"
                    data-cart-item-id="${item.cartItemId}"
                    style="width: 90px;"
                >
            </td>

            <td>
                ${lineTotal.toFixed(2)}
            </td>

            <td>
                <button
                    class="btn btn-danger btn-sm remove-item-btn"
                    data-cart-item-id="${item.cartItemId}">
                    Remove
                </button>
            </td>
        `;

        container.appendChild(row);
    });

    totalElement.textContent = total.toFixed(2);

    container
        .querySelectorAll(".quantity-input")
        .forEach(input => {

            let timeout;

            input.addEventListener("input", () => {
                clearTimeout(timeout);

                timeout = setTimeout(() => {
                    const cartItemId =
                        input.dataset.cartItemId;

                    const quantity =
                        Number(input.value);

                    if (quantity < 1) {
                        input.value = 1;
                        return;
                    }

                    adjustQuantity(
                        cartItemId,
                        quantity
                    );
                }, 500);
            });
        });

    container
        .querySelectorAll(".remove-item-btn")
        .forEach(button => {

            button.addEventListener("click", () => {
                removeItem(
                    button.dataset.cartItemId
                );
            });
        });
}

async function adjustQuantity(cartItemId, quantity) {
    showLoading();

    try {
        const response = await apiFetch(
            "/CartItem/adjustQuantity",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cartItemId: Number(cartItemId),
                    quantity: Number(quantity)
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update quantity.");
        }

        showToast("Quantity updated.");
        await loadCart();

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function removeItem(cartItemId) {
    showLoading();

    try {
        const response = await apiFetch(
            "/CartItem/remove",
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cartItemId: Number(cartItemId)
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to remove item.");
        }

        showToast("Item removed.");
        await loadCart();

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function clearCart() {
    if (!cartId) {
        showError("Cart ID was not found.");
        return;
    }

    if (!confirm("Are you sure you want to clear your cart?")) {
        return;
    }

    showLoading();

    try {
        const response = await apiFetch(
            `/Cart/clear?id=${cartId}`,
            {
                method: "PATCH"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to clear cart.");
        }

        showToast("Cart cleared.");
        await loadCart();

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function addToCart(productId, quantity = 1) {
    if (!cartId) {
        showError("Cart ID was not found.");
        return;
    }

    try {
        const response = await apiFetch(
            "/CartItem/add",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    cartId: Number(cartId),
                    productId: Number(productId),
                    quantity: Number(quantity)
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to add product.");
        }

        showToast("Added to cart.");

    } catch (error) {
        showError(error.message);
    }
}

function goToCheckout() {
    window.location.href = "checkout.html";
}

function showLoading() {
    document
        .getElementById("loading")
        .classList.remove("d-none");
}

function hideLoading() {
    document
        .getElementById("loading")
        .classList.add("d-none");
}

function showError(message) {
    const errorElement =
        document.getElementById("errorMessage");

    errorElement.textContent = message;
    errorElement.classList.remove("d-none");
}

function showToast(message) {
    const toastContainer =
        document.createElement("div");

    toastContainer.className =
        "toast-container position-fixed bottom-0 end-0 p-3";

    toastContainer.innerHTML = `
        <div
            class="toast text-bg-success"
            role="alert">

            <div class="d-flex">

                <div class="toast-body">
                    ${message}
                </div>

                <button
                    type="button"
                    class="btn-close btn-close-white me-2 m-auto"
                    data-bs-dismiss="toast">
                </button>

            </div>
        </div>
    `;

    document.body.appendChild(toastContainer);

    const toast =
        new bootstrap.Toast(
            toastContainer.querySelector(".toast"),
            { delay: 2000 }
        );

    toast.show();

    toastContainer
        .querySelector(".toast")
        .addEventListener(
            "hidden.bs.toast",
            () => toastContainer.remove()
        );
}