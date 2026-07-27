package com.mycompany.mavenproject1;

public class PasswordChangeRequest {
    private String actual;
    private String nueva;

    public PasswordChangeRequest() {}

    public String getActual() { return actual; }
    public void setActual(String actual) { this.actual = actual; }

    public String getNueva() { return nueva; }
    public void setNueva(String nueva) { this.nueva = nueva; }
}