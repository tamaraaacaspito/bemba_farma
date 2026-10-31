package com.mypk2.drogueria_eka_app.ui.login

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.snackbar.Snackbar
import com.mypk2.drogueria_eka_app.MainActivity
import com.mypk2.drogueria_eka_app.data.local.SessionManager
import com.mypk2.drogueria_eka_app.data.remote.RetrofitClient
import com.mypk2.drogueria_eka_app.databinding.ActivityLoginBinding

import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var sessionManager: SessionManager
    private val loginViewModel: LoginViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Inicializar RetrofitClient y SessionManager
        RetrofitClient.init(this)
        sessionManager = SessionManager.getInstance(this)

        // Si ya hay sesión activa, ir directo al Dashboard
        if (sessionManager.isLoggedIn()) {
            navegarAMain()
            return
        }

        // Configuración de ViewBinding
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupObservers()
        setupListeners()
    }

    private fun setupListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                showErrorSnackbar("Por favor ingrese correo y contraseña")
                return@setOnClickListener
            }

            // Llamada al ViewModel con el backend real
            loginViewModel.login(email, password)
        }
    }

    private fun setupObservers() {
        loginViewModel.loginState.observe(this) { state ->
            when (state) {
                is LoginState.Loading -> {
                    binding.progressBar.visibility = View.VISIBLE
                    binding.btnLogin.isEnabled = false
                }
                is LoginState.Success -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnLogin.isEnabled = true

                    // Guardar sesión completa: token + datos de usuario
                    sessionManager.saveSession(
                        token = state.token,
                        userId = state.usuario.id,
                        userName = state.usuario.nombre,
                        email = state.usuario.email,
                        rol = state.usuario.rol
                    )
                    navegarAMain()
                }
                is LoginState.Error -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnLogin.isEnabled = true

                    manejarErrorHttp(state.code, state.message)
                }
            }
        }
    }

    private fun manejarErrorHttp(code: Int, customMessage: String) {
        val mensaje = when (code) {
            401 -> "Credenciales incorrectas. Verifica tu contraseña."
            403 -> "Cuenta desactivada. Contacta al administrador."
            404 -> "Usuario no encontrado. Verifica tu correo."
            -1 -> "Error de conexión. Verifica que el servidor esté activo."
            else -> customMessage
        }
        showErrorSnackbar(mensaje)
    }

    private fun showErrorSnackbar(mensaje: String) {
        Snackbar.make(binding.root, mensaje, Snackbar.LENGTH_LONG)
            .setBackgroundTint(resources.getColor(android.R.color.holo_red_dark, theme))
            .setTextColor(resources.getColor(android.R.color.white, theme))
            .show()
    }

    private fun navegarAMain() {
        val intent = Intent(this, MainActivity::class.java)
        // Evitamos que el usuario regrese al login usando el botón "Atrás"
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
