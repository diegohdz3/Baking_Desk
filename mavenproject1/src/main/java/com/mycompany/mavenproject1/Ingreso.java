package com.mycompany.mavenproject1;
import java.math.BigDecimal;

public class Ingreso {
    private int id;
    private Integer pedido_id; // Integer permite nulos para ventas directas sin pedido
    private String concepto;
    private BigDecimal monto;
    private String fecha;

    public Ingreso() {}

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public Integer getPedido_id() { return pedido_id; }
    public void setPedido_id(Integer pedido_id) { this.pedido_id = pedido_id; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
}