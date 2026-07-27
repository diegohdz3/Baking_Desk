package com.mycompany.mavenproject1;
import java.math.BigDecimal;

public class MovimientoFinanciero {
    private String tipo;       // "ingreso" o "gasto"
    private int id;
    private String concepto;
    private BigDecimal monto;
    private String fecha;
    private String categoria;  
    private Integer pedidoId;
    private String fechaEntrega;

    public MovimientoFinanciero() {}

    // Getters y Setters
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getConcepto() { return concepto; }
    public void setConcepto(String concepto) { this.concepto = concepto; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public Integer getPedidoId() { return pedidoId; }
    public void setPedidoId(Integer pedidoId) { this.pedidoId = pedidoId; }
    public String getFechaEntrega() { return fechaEntrega; }
    public void setFechaEntrega(String fechaEntrega) { this.fechaEntrega = fechaEntrega; }
}