package com.mycompany.mavenproject1;

public class LoginRequest {
    private String username;
    private String password;
    private boolean remember;

    // Constructor vacío obligatorio para Jackson
    public LoginRequest() {}

    // Getters y Setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isRemember() { return remember; }
    public void setRemember(boolean remember) { this.remember = remember; }
}