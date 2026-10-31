package com.mypk2.drogueria_eka_app.data.model

/**
 * Modelo para la petición de Login
 * El backend espera { email, password } — NO password_hash
 */
data class LoginRequest(
    val email: String,
    val password: String
)

/**
 * Respuesta exitosa del endpoint POST /api/auth/login
 * Backend devuelve: { token: "jwt...", usuario: { id, nombre, email, rol } }
 */
data class LoginResponse(
    val token: String,
    val usuario: Usuario
)

/**
 * Entidad Usuario — alineada con la respuesta real del backend
 * El backend devuelve el rol como STRING ("ADMIN", "ALMACEN"), no como rol_id
 */
data class Usuario(
    val id: Int,
    val nombre: String,
    val email: String,
    val rol: String
)
