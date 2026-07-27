package com.mycompany.mavenproject1;

import java.sql.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DashboardDAO {

    public DashboardResumen obtenerResumen() {
        DashboardResumen resumen = new DashboardResumen();
        
        DashboardResumen.Stats stats = new DashboardResumen.Stats();
        stats.pedidosHoy = 0;
        stats.ventasHoy = BigDecimal.ZERO;
        stats.productosBajos = 0;
        stats.clientes = 0;
        
        DashboardResumen.PedidosEstado estados = new DashboardResumen.PedidosEstado();
        estados.nuevo = 0;
        estados.enCurso = 0;
        estados.listo = 0;
        estados.entregado = 0;
        estados.total = 0;

        List<BigDecimal> ventasSemana = new ArrayList<>();
        // Inicializamos los 7 días de la semana (Lunes a Domingo) en cero
        for (int i = 0; i < 7; i++) {
            ventasSemana.add(BigDecimal.ZERO);
        }

        List<DashboardResumen.PedidoReciente> recientes = new ArrayList<>();

        try (Connection con = ConexionBD.getConexion()) {
            
            // ==========================================
            // 1. CARGAR TARJETAS MÉTRICAS (STATS)
            // ==========================================
            
            // CAMBIO: Contar pedidos programados o entregados PARA HOY (por fecha_entrega)
            String sqlPedidosHoy = "SELECT COUNT(*) FROM Pedido WHERE fecha_entrega = CURDATE()";
            try (PreparedStatement ps = con.prepareStatement(sqlPedidosHoy);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) stats.pedidosHoy = rs.getInt(1);
            }

            // CAMBIO: Ventas entregadas HOY (Suma ingresos usando la fecha_entrega del Pedido)
            String sqlVentasHoy = 
                "SELECT COALESCE(SUM(i.monto), 0) " +
                "FROM Ingreso i " +
                "LEFT JOIN Pedido p ON i.pedido_id = p.id " +
                "WHERE COALESCE(p.fecha_entrega, i.fecha) = CURDATE()";
            try (PreparedStatement ps = con.prepareStatement(sqlVentasHoy);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) stats.ventasHoy = rs.getBigDecimal(1);
            }

            // Insumos por debajo o igual al stock mínimo
            String sqlBajos = "SELECT COUNT(*) FROM Ingrediente WHERE stock_actual <= stock_minimo";
            try (PreparedStatement ps = con.prepareStatement(sqlBajos);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) stats.productosBajos = rs.getInt(1);
            }

            // Clientes activos registrados
            String sqlClientes = "SELECT COUNT(*) FROM Cliente WHERE estado = 'activo'";
            try (PreparedStatement ps = con.prepareStatement(sqlClientes);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) stats.clientes = rs.getInt(1);
            }
            resumen.setStats(stats);

            // ==========================================
            // 2. VENTAS DE LA SEMANA (LUNES A DOMINGO)
            // ==========================================
            // CAMBIO: Agrupar por el día de la semana según la fecha_entrega del pedido
            String sqlVentaSemanal = 
                "SELECT WEEKDAY(COALESCE(p.fecha_entrega, i.fecha)) AS dia_semana, SUM(i.monto) AS total " +
                "FROM Ingreso i " +
                "LEFT JOIN Pedido p ON i.pedido_id = p.id " +
                "WHERE YEARWEEK(COALESCE(p.fecha_entrega, i.fecha), 1) = YEARWEEK(CURDATE(), 1) " +
                "GROUP BY WEEKDAY(COALESCE(p.fecha_entrega, i.fecha))";
                
            try (PreparedStatement ps = con.prepareStatement(sqlVentaSemanal);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    int index = rs.getInt("dia_semana");
                    if (index >= 0 && index < 7) {
                        ventasSemana.set(index, rs.getBigDecimal("total"));
                    }
                }
            }
            resumen.setVentasSemana(ventasSemana);

            // ==========================================
            // 3. GRÁFICO DONA: PEDIDOS POR ESTADO
            // ==========================================
            String sqlEstados = "SELECT estado, COUNT(*) as cantidad FROM Pedido GROUP BY estado";
            try (PreparedStatement ps = con.prepareStatement(sqlEstados);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String est = rs.getString("estado").toLowerCase();
                    int cant = rs.getInt("cantidad");
                    
                    switch (est) {
                        case "nuevo":
                            estados.nuevo += cant;
                            break;
                        case "en-curso": // ¡AQUÍ ESTABA EL ERROR! (se agregó el guion)
                        case "en curso": // Dejamos este también por si algún día lo guardas con espacio
                            estados.enCurso += cant;
                            break;
                        case "listo":
                            estados.listo += cant;
                            break;
                        case "entregado":
                            estados.entregado += cant;
                            break;
                    }
                }
                estados.total = estados.nuevo + estados.enCurso + estados.listo + estados.entregado;
            }
            resumen.setPedidosEstado(estados);

            // ==========================================
            // 4. TABLA: PEDIDOS RECIENTES (Últimos 5 ordenados por entrega)
            // ==========================================
            String sqlRecientes = 
                "SELECT p.id, c.nombre AS cliente, p.fecha_entrega, p.estado, p.total, " +
                "       COALESCE((SELECT GROUP_CONCAT(prod.nombre SEPARATOR ', ') " +
                "                 FROM Detalle_Pedido dp " +
                "                 JOIN Producto prod ON dp.producto_id = prod.id " +
                "                 WHERE dp.pedido_id = p.id), 'Sin productos') AS productos " +
                "FROM Pedido p " +
                "JOIN Cliente c ON p.cliente_id = c.id " +
                "ORDER BY p.fecha_entrega DESC, p.id DESC LIMIT 5";

            try (PreparedStatement ps = con.prepareStatement(sqlRecientes);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    DashboardResumen.PedidoReciente pr = new DashboardResumen.PedidoReciente();
                    pr.id = rs.getInt("id");
                    pr.cliente = rs.getString("cliente");
                    pr.producto = rs.getString("productos");
                    pr.fechaEntrega = rs.getDate("fecha_entrega").toString();
                    pr.estado = rs.getString("estado");
                    pr.total = rs.getBigDecimal("total");
                    recientes.add(pr);
                }
            }
            resumen.setPedidosRecientes(recientes);

        } catch (SQLException e) {
            System.err.println("Error al compilar métricas del Dashboard: " + e.getMessage());
        }

        return resumen;
    }
}