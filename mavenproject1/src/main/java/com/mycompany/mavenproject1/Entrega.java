package com.mycompany.mavenproject1;

public class Entrega {
    private int id;              // ID autoincremental de la entrega
    private int pedidoId;        // Relación requerida con la tabla Pedido
    private String cliente;      // Nombre del cliente (obtenido mediante JOIN en las consultas)
    private String fecha;        // Mapea a 'fecha_entrega' (YYYY-MM-DD)
    private String hora;         // Mapea a 'hora_entrega' (HH:MM)
    private String metodo;       // Mapea a 'metodo_envio' ('domicilio' o 'recoleccion')
    private String estado;       // Mapea a 'estado' de la entrega
    private String direccion;    // Mapea a 'direccion_entrega'
    private String notas;        // Mapea a 'notas'

    public Entrega() {}

    // Getters y Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public int getPedidoId() { return pedidoId; }
    public void setPedidoId(int pedidoId) { this.pedidoId = pedidoId; }

    public String getCliente() { return cliente; }
    public void setCliente(String cliente) { this.cliente = cliente; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public String getHora() { return hora; }
    public void setHora(String hora) { this.hora = hora; }

    public String getMetodo() { return metodo; }
    public void setMetodo(String metodo) { this.metodo = metodo; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}