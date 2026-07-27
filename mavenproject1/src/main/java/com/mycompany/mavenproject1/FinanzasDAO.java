package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class FinanzasDAO {

// ==========================================
    // 1. Obtener listado unificado de movimientos ordenados por fecha descendente
    // ==========================================
    public List<MovimientoFinanciero> obtenerTodos() {
        List<MovimientoFinanciero> movimientos = new ArrayList<>();
        
        // MODIFICACIÓN EN EL SQL: Se agregó p.fecha_entrega para ingresos y NULL para gastos
        String sql = 
            "SELECT 'ingreso' AS tipo, i.id, i.concepto, i.monto, i.fecha, " +
            "       COALESCE(CONCAT('Pedido #', i.pedido_id, ' - ', c.nombre), 'Venta Directa') AS categoria, " +
            "       i.pedido_id AS pedidoId, " +
            "       p.fecha_entrega AS fecha_entrega " + 
            "FROM Ingreso i " +
            "LEFT JOIN Pedido p ON i.pedido_id = p.id " +
            "LEFT JOIN Cliente c ON p.cliente_id = c.id " +
            "UNION ALL " +
            "SELECT 'gasto' AS tipo, g.id, g.concepto, g.monto, g.fecha, " +
            "       cg.nombre AS categoria, " +
            "       NULL AS pedidoId, " +
            "       NULL AS fecha_entrega " + 
            "FROM Gasto g " +
            "LEFT JOIN Categoria_Gasto cg ON g.categoria_id = cg.id " +
            "ORDER BY fecha DESC, id DESC";

        try (Connection con = ConexionBD.getConexion();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                MovimientoFinanciero mov = new MovimientoFinanciero();
                mov.setTipo(rs.getString("tipo"));
                mov.setId(rs.getInt("id"));
                mov.setConcepto(rs.getString("concepto"));
                mov.setMonto(rs.getBigDecimal("monto"));
                mov.setFecha(rs.getString("fecha"));
                mov.setCategoria(rs.getString("categoria"));
                
                int pId = rs.getInt("pedidoId");
                mov.setPedidoId(rs.wasNull() ? null : pId);
                
                // MODIFICACIÓN EN LA LECTURA: Guardamos la fecha de entrega en el objeto
                mov.setFechaEntrega(rs.getString("fecha_entrega"));
                
                movimientos.add(mov);
            }
        } catch (SQLException e) {
            System.err.println("Error en FinanzasDAO.obtenerTodos: " + e.getMessage());
        }
        return movimientos;
    }


    // ==========================================
    // 2. Obtener los 5 productos que más ingresos han generado (Pedidos Entregados)
    // (SE CONSERVA)
    // ==========================================
    public List<Map<String, Object>> obtenerProductosMasVendidos() {
        List<Map<String, Object>> topVentas = new ArrayList<>();
        double sumaTotalTop5 = 0.0;
        
        String sql = 
            "SELECT pr.nombre AS producto, " +
            "       SUM(COALESCE(dp.cantidad, 0)) AS cantidad_total, " +
            "       SUM(COALESCE(dp.cantidad, 0) * COALESCE(dp.precio_unitario, 0)) AS ingresos_totales " +
            "FROM Pedido p " +
            "INNER JOIN Detalle_Pedido dp ON p.id = dp.pedido_id " +
            "INNER JOIN Producto pr ON dp.producto_id = pr.id " +
            "WHERE TRIM(LOWER(p.estado)) = 'entregado' " +
            "GROUP BY pr.id, pr.nombre " +
            "ORDER BY ingresos_totales DESC " +
            "LIMIT 5";

        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("nombreProducto", rs.getString("producto"));
                fila.put("cantidadVendida", rs.getInt("cantidad_total"));
                
                double ingresos = rs.getDouble("ingresos_totales");
                fila.put("totalIngresos", ingresos);
                
                sumaTotalTop5 += ingresos;
                topVentas.add(fila);
            }
            
            if (sumaTotalTop5 > 0) {
                int sumaPorcentajes = 0;
                
                for (int i = 0; i < topVentas.size(); i++) {
                    Map<String, Object> fila = topVentas.get(i);
                    double ingresos = (Double) fila.get("totalIngresos");
                    
                    int porcentaje = (int) Math.round((ingresos / sumaTotalTop5) * 100);
                    fila.put("porcentaje", porcentaje);
                    sumaPorcentajes += porcentaje;
                }
                
                if (sumaPorcentajes != 100 && !topVentas.isEmpty()) {
                    Map<String, Object> primero = topVentas.get(0);
                    int porcActual = primero.get("porcentaje") != null ? (Integer) primero.get("porcentaje") : 0;
                    primero.put("porcentaje", porcActual + (100 - sumaPorcentajes));
                }
            } else {
                for (Map<String, Object> fila : topVentas) {
                    fila.put("porcentaje", 0);
                }
            }
            
        } catch (SQLException e) {
            System.err.println("Error en FinanzasDAO.obtenerProductosMasVendidos: " + e.getMessage());
        }
        return topVentas;
    }


    // ==========================================
    // 3. NUEVO: Obtener datos de la gráfica dinámicos (Semana, Mes, Año)
    // ==========================================
    public List<Map<String, Object>> obtenerDatosGrafica(String filtro) {
        List<Map<String, Object>> datosGrafica = new ArrayList<>();
        String sql;

        if ("semana".equalsIgnoreCase(filtro)) {
            // Últimos 7 días
            sql = "SELECT " +
                  "  DATE_FORMAT(d.dia_fecha, '%d %b') AS etiqueta, " +
                  "  COALESCE((SELECT SUM(monto) FROM Ingreso WHERE fecha = d.dia_fecha), 0) AS total_ingresos, " +
                  "  COALESCE((SELECT SUM(monto) FROM Gasto WHERE fecha = d.dia_fecha), 0) AS total_gastos " +
                  "FROM (" +
                  "  SELECT CURRENT_DATE() - INTERVAL (sub.n) DAY AS dia_fecha " +
                  "  FROM (SELECT 6 AS n UNION SELECT 5 UNION SELECT 4 UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) sub " +
                  ") d " +
                  "ORDER BY d.dia_fecha ASC";
        } else if ("anio".equalsIgnoreCase(filtro)) {
            // Últimos 12 meses
            sql = "SELECT " +
                  "  DATE_FORMAT(m.mes_fecha, '%b %Y') AS etiqueta, " +
                  "  COALESCE((SELECT SUM(monto) FROM Ingreso WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(m.mes_fecha, '%Y-%m')), 0) AS total_ingresos, " +
                  "  COALESCE((SELECT SUM(monto) FROM Gasto WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(m.mes_fecha, '%Y-%m')), 0) AS total_gastos " +
                  "FROM (" +
                  "  SELECT CURRENT_DATE() - INTERVAL (sub.n) MONTH AS mes_fecha " +
                  "  FROM (SELECT 11 AS n UNION SELECT 10 UNION SELECT 9 UNION SELECT 8 UNION SELECT 7 UNION SELECT 6 UNION SELECT 5 UNION SELECT 4 UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) sub " +
                  ") m " +
                  "ORDER BY m.mes_fecha ASC";
        } else {
            // Por defecto "mes": Últimos 6 meses hacia atrás desde hoy (Feb, Mar, Abr, May, Jun, Jul)
            sql = "SELECT " +
                  "  DATE_FORMAT(m.mes_fecha, '%b') AS etiqueta, " +
                  "  COALESCE((SELECT SUM(monto) FROM Ingreso WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(m.mes_fecha, '%Y-%m')), 0) AS total_ingresos, " +
                  "  COALESCE((SELECT SUM(monto) FROM Gasto WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(m.mes_fecha, '%Y-%m')), 0) AS total_gastos " +
                  "FROM (" +
                  "  SELECT CURRENT_DATE() - INTERVAL (sub.n) MONTH AS mes_fecha " +
                  "  FROM (SELECT 5 AS n UNION SELECT 4 UNION SELECT 3 UNION SELECT 2 UNION SELECT 1 UNION SELECT 0) sub " +
                  ") m " +
                  "ORDER BY m.mes_fecha ASC";
        }

        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                Map<String, Object> fila = new HashMap<>();
                fila.put("etiqueta", rs.getString("etiqueta"));
                fila.put("ingresos", rs.getDouble("total_ingresos"));
                fila.put("gastos", rs.getDouble("total_gastos"));
                datosGrafica.add(fila);
            }
        } catch (SQLException e) {
            System.err.println("Error en FinanzasDAO.obtenerDatosGrafica: " + e.getMessage());
            e.printStackTrace();
        }

        return datosGrafica;
    }


    // ==========================================
    // 4. NUEVO: Obtener Totales para las 4 tarjetas superiores (Mes Actual)
    // ==========================================
    public Map<String, Object> obtenerResumenKpis() {
        Map<String, Object> resumen = new HashMap<>();
        
        String sqlIngresos = "SELECT COALESCE(SUM(monto), 0) FROM Ingreso WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')";
        String sqlGastos = "SELECT COALESCE(SUM(monto), 0) FROM Gasto WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')";

        try (Connection con = ConexionBD.getConexion()) {
            
            double totalIngresos = 0;
            double totalGastos = 0;

            try (PreparedStatement ps = con.prepareStatement(sqlIngresos); ResultSet rs = ps.executeQuery()) {
                if (rs.next()) totalIngresos = rs.getDouble(1);
            }

            try (PreparedStatement ps = con.prepareStatement(sqlGastos); ResultSet rs = ps.executeQuery()) {
                if (rs.next()) totalGastos = rs.getDouble(1);
            }

            double gananciaNeta = totalIngresos - totalGastos;
            double margen = totalIngresos > 0 ? (gananciaNeta / totalIngresos) * 100 : 0.0;

            resumen.put("ingresosMes", totalIngresos);
            resumen.put("gastosMes", totalGastos);
            resumen.put("gananciaNeta", gananciaNeta);
            resumen.put("margen", Math.round(margen * 10.0) / 10.0);

        } catch (SQLException e) {
            System.err.println("Error en FinanzasDAO.obtenerResumenKpis: " + e.getMessage());
        }

        return resumen;
    }
}