package com.mycompany.mavenproject1;

public class CompraRequest {
    private int ingredienteId;
    private double cantidadComprada;
    private double costoTotal;
    private int usuarioId;
    private int categoriaGastoId;

    public CompraRequest() {}

    // Getters y Setters
    public int getIngredienteId() { return ingredienteId; }
    public void setIngredienteId(int ingredienteId) { this.ingredienteId = ingredienteId; }

    public double getCantidadComprada() { return cantidadComprada; }
    public void setCantidadComprada(double cantidadComprada) { this.cantidadComprada = cantidadComprada; }

    public double getCostoTotal() { return costoTotal; }
    public void setCostoTotal(double costoTotal) { this.costoTotal = costoTotal; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public int getCategoriaGastoId() { return categoriaGastoId; }
    public void setCategoriaGastoId(int categoriaGastoId) { this.categoriaGastoId = categoriaGastoId; }
}