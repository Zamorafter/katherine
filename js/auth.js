document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMsg');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('d-none');
    } else {
        // Redirigir a admin.html
        window.location.href = 'admin.html';
    }
});