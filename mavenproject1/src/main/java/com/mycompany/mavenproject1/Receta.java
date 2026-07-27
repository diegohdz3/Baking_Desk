package com.mycompany.mavenproject1;

public class Receta {
    private int id;
    private int productoId;
    private int ingredienteId;
    private double cantidadRequerida;
    private String unidad;

    // Campos auxiliares para lectura (JOIN)
    private String nombreIngrediente;
    private String unidadMedida;

    // Constructor vacío OBLIGATORIO para Javalin / Jackson
    public Receta() {}

    // Constructor para inserciones
    public Receta(int productoId, int ingredienteId, double cantidadRequerida, String unidad) {
        this.productoId = productoId;
        this.ingredienteId = ingredienteId;
        this.cantidadRequerida = cantidadRequerida;
        this.unidad = unidad;
    }

    // Constructor completo para lecturas (SELECT)
    public Receta(int id, int productoId, int ingredienteId, double cantidadRequerida, String unidad, String nombreIngrediente, String unidadMedida) {
        this.id = id;
        this.productoId = productoId;
        this.ingredienteId = ingredienteId;
        this.cantidadRequerida = cantidadRequerida;
        this.unidad = unidad;
        this.nombreIngrediente = nombreIngrediente;
        this.unidadMedida = unidadMedida;
    }

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getProductoId() { return productoId; }
    public void setProductoId(int productoId) { this.productoId = productoId; }

    public int getIngredienteId() { return ingredienteId; }
    public void setIngredienteId(int ingredienteId) { this.ingredienteId = ingredienteId; }

    public double getCantidadRequerida() { return cantidadRequerida; }
    public void setCantidadRequerida(double cantidadRequerida) { this.cantidadRequerida = cantidadRequerida; }

    public String getUnidad() { return unidad; }
    public void setUnidad(String unidad) { this.unidad = unidad; }

    public String getNombreIngrediente() { return nombreIngrediente; }
    public void setNombreIngrediente(String nombreIngrediente) { this.nombreIngrediente = nombreIngrediente; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }
}