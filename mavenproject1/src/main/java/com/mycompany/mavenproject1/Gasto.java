package com.mycompany.mavenproject1;
import java.math.BigDecimal;

public class Gasto {
    private int id;
    private String concepto;
    private Integer categoria_id; // FK a Categoria_Gasto
    private BigDecimal monto;
    private String fecha;

    public Gasto() {}

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public Integer getCategoria_id() { return categoria_id; }
    public void setCategoria_id(Integer categoria_id) { this.categoria_id = categoria_id; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}