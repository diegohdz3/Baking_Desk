package com.mycompany.mavenproject1;

import java.util.List;

public class Pedido {
    private int id;
    private int clienteId;
    private int usuarioId;
    private String estado;
    private double total;
    private String notas;
    private String fechaEntrega; // Usamos String (YYYY-MM-DD) para simplificar con el Front
    private String createdAt;

    // Campos extra (JOINs) que van a facilitar la vida en el Front-end
    private String nombreCliente;
    private String nombreUsuario;
    private List<DetallePedido> detalles; // Lista de productos incluidos en la orden

    public Pedido() {}

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getClienteId() { return clienteId; }
    public void setClienteId(int clienteId) { this.clienteId = clienteId; }

    public int getUsuarioId() { return usuarioId; }
    public void setUsuarioId(int usuarioId) { this.usuarioId = usuarioId; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public double getTotal() { return total; }
    public void setTotal(double total) { this.total = total; }

   public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public String getFechaEntrega() { return fechaEntrega; }
    public void setFechaEntrega(String fechaEntrega) { this.fechaEntrega = fechaEntrega; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getNombreCliente() { return nombreCliente; }
    public void setNombreCliente(String nombreCliente) { this.nombreCliente = nombreCliente; }

    public String getNombreUsuario() { return nombreUsuario; }
    public void setNombreUsuario(String nombreUsuario) { this.nombreUsuario = nombreUsuario; }

    public List<DetallePedido> getDetalles() { return detalles; }
    public void setDetalles(List<DetallePedido> detalles) { this.detalles = detalles; }
    
    private String nombreProducto;
public String getNombreProducto() { return nombreProducto; }
public void setNombreProducto(String nombreProducto) { this.nombreProducto = nombreProducto; }
}