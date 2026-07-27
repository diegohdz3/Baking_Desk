package com.mycompany.mavenproject1;

import java.math.BigDecimal;
import java.util.List;

public class DashboardResumen {
    private Stats stats;
    private List<BigDecimal> ventasSemana;
    private PedidosEstado pedidosEstado;
    private List<PedidoReciente> pedidosRecientes;

    public DashboardResumen() {}

    // ---- SUBCLASES QUE MAPEAN EL JSON ----

    public static class Stats {
        public int pedidosHoy;
        public BigDecimal ventasHoy;
        public int productosBajos;
        public int clientes;

        public Stats() {}
    }

    public static class PedidosEstado {
        public int nuevo;
        public int enCurso;
        public int listo;
        public int entregado;
        public int total;

        public PedidosEstado() {}
    }

    public static class PedidoReciente {
        public int id;
        public String cliente;
        public String producto; // Contiene la lista de productos del pedido unida por comas
        public String fechaEntrega;
        public String estado;
        public BigDecimal total;

        public PedidoReciente() {}
    }

    // ---- GETTERS Y SETTERS PRINCIPALES ----
    public Stats getStats() { return stats; }
    public void setStats(Stats stats) { this.stats = stats; }

    public List<BigDecimal> getVentasSemana() { return ventasSemana; }
    public void setVentasSemana(List<BigDecimal> ventasSemana) { this.ventasSemana = ventasSemana; }

    public PedidosEstado getPedidosEstado() { return pedidosEstado; }
    public void setPedidosEstado(PedidosEstado pedidosEstado) { this.pedidosEstado = pedidosEstado; }

    public List<PedidoReciente> getPedidosRecientes() { return pedidosRecientes; }
    public void setPedidosRecientes(List<PedidoReciente> pedidosRecientes) { this.pedidosRecientes = pedidosRecientes; }
}