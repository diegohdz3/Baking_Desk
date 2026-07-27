package com.mycompany.mavenproject1;

public class Configuracion {
    private int id;
    private String nombreNegocio;
    private String datosGenerales;

    // Constructor vacío (obligatorio para la línea: new Configuracion())
    public Configuracion() {}

    // Constructor con parámetros (usado en el DAO)
    public Configuracion(int id, String nombreNegocio, String datosGenerales) {
        this.id = id;
        this.nombreNegocio = nombreNegocio;
        this.datosGenerales = datosGenerales;
    }

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getNombreNegocio() { return nombreNegocio; }
    public void setNombreNegocio(String nombreNegocio) { this.nombreNegocio = nombreNegocio; }

    public String getDatosGenerales() { return datosGenerales; }
    public void setDatosGenerales(String datosGenerales) { this.datosGenerales = datosGenerales; }
}