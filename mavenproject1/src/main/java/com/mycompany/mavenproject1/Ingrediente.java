package com.mycompany.mavenproject1; // Ajusta el paquete según tu estructura

public class Ingrediente {
    private int idIngrediente;
    private String nombre;
    private String idCategoria; // <-- CAMBIADO DE int A String para aceptar texto libre
    private double stockActual;
    private double stockMinimo;
    private String unidadMedida; // Ej: "Kg", "Liters", "Units"
    private double precioUnitario;

    // Constructor vacío
    public Ingrediente() {}

    // Constructor completo actualizado con String para idCategoria
    public Ingrediente(int idIngrediente, String nombre, String idCategoria, double stockActual, 
                       double stockMinimo, String unidadMedida, double precioUnitario) {
        this.idIngrediente = idIngrediente;
        this.nombre = nombre;
        this.idCategoria = idCategoria;
        this.stockActual = stockActual;
        this.stockMinimo = stockMinimo;
        this.unidadMedida = unidadMedida;
        this.precioUnitario = precioUnitario;
    }

    // Getters y Setters actualizados
    public int getIdIngrediente() { return idIngrediente; }
    public void setIdIngrediente(int idIngrediente) { this.idIngrediente = idIngrediente; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getIdCategoria() { return idCategoria; } // <-- Retorna String
    public void setIdCategoria(String idCategoria) { this.idCategoria = idCategoria; } // <-- Acepta String

    public double getStockActual() { return stockActual; }
    public void setStockActual(double stockActual) { this.stockActual = stockActual; }

    public double getStockMinimo() { return stockMinimo; }
    public void setStockMinimo(double stockMinimo) { this.stockMinimo = stockMinimo; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

    public double getPrecioUnitario() { return precioUnitario; }
    public void setPrecioUnitario(double precioUnitario) { this.precioUnitario = precioUnitario; }
}