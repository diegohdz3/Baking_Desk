package com.mycompany.mavenproject1;

public class LoginResponse {
    private String nombre;
    private String username;
    private String rol;

    public LoginResponse(String nombre, String username, String rol) {
        this.nombre = nombre;
        this.username = username;
        this.rol = rol;
    }

    // Getters
    public String getNombre() { return nombre; }
    public String getUsername() { return username; }
    public String getRol() { return rol; }
}