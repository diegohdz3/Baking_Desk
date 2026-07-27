package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class EntregaDAO {

    // 1. Obtener todas las entregas con el nombre de su respectivo cliente (vía JOIN)
    public List<Entrega> obtenerTodas() {
        List<Entrega> lista = new ArrayList<>();
        String sql = "SELECT e.id, e.pedido_id, c.nombre AS cliente_nombre, e.fecha_entrega, " +
                     "e.hora_entrega, e.metodo_envio, e.estado, e.direccion_entrega, e.notas " +
                     "FROM Entrega e " +
                     "JOIN Pedido p ON e.pedido_id = p.id " +
                     "JOIN Cliente c ON p.cliente_id = c.id " +
                     "ORDER BY e.fecha_entrega ASC, e.hora_entrega ASC";

        try (Connection con = ConexionBD.getConexion();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Entrega ent = new Entrega();
                ent.setId(rs.getInt("id"));
                ent.setPedidoId(rs.getInt("pedido_id"));
                ent.setCliente(rs.getString("cliente_nombre")); // Extraído del JOIN
                ent.setFecha(rs.getString("fecha_entrega"));
                ent.setHora(rs.getString("hora_entrega"));
                ent.setMetodo(rs.getString("metodo_envio"));
                ent.setEstado(rs.getString("estado"));
                ent.setDireccion(rs.getString("direccion_entrega"));
                ent.setNotas(rs.getString("notas"));
                lista.add(ent);
            }
        } catch (SQLException e) {
            System.err.println("Error al listar entregas con JOIN: " + e.getMessage());
        }
        return lista;
    }

    // 2. Insertar una entrega vinculada a un pedido existente
    // 2. Insertar una entrega vinculada a un pedido existente
    public boolean crear(Entrega ent) {
        // Validación/Fallback: si no viene un pedidoId, intentamos buscar el último pedido activo de este cliente
        if (ent.getPedidoId() == 0 && ent.getCliente() != null) {
            String sqlBuscarPedido = "SELECT p.id FROM Pedido p " +
                                     "JOIN Cliente c ON p.cliente_id = c.id " +
                                     "WHERE c.nombre = ? OR c.id = ? " +
                                     "ORDER BY p.id DESC LIMIT 1";
            try (Connection con = ConexionBD.getConexion();
                 PreparedStatement psB = con.prepareStatement(sqlBuscarPedido)) {
                psB.setString(1, ent.getCliente());
                
                // Intentamos convertir a número por si el cliente mandó su ID en el String
                int idClie = 0;
                try { idClie = Integer.parseInt(ent.getCliente()); } catch(NumberFormatException e){}
                psB.setInt(2, idClie);

                try (ResultSet rs = psB.executeQuery()) {
                    if (rs.next()) {
                        ent.setPedidoId(rs.getInt("id"));
                    }
                }
            } catch (SQLException e) {
                System.err.println("Error al buscar pedido asociado para el cliente: " + e.getMessage());
            }
        }

        String sql = "INSERT INTO Entrega (pedido_id, fecha_entrega, hora_entrega, metodo_envio, " +
                     "direccion_entrega, estado, notas, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {

            // Si a pesar de todo sigue siendo 0, lanzamos un error descriptivo en consola
            if (ent.getPedidoId() == 0) {
                System.err.println("Advertencia: Se está intentando registrar una entrega sin un pedido_id válido.");
            }

            ps.setInt(1, ent.getPedidoId());
            ps.setString(2, ent.getFecha());
            ps.setString(3, ent.getHora());
            ps.setString(4, ent.getMetodo());
            ps.setString(5, ent.getDireccion());
            ps.setString(6, ent.getEstado());
            ps.setString(7, ent.getNotas());
            ps.setObject(8, null); 

            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al registrar entrega en la base de datos: " + e.getMessage());
            return false;
        }
    }

    // 3. Actualizar los datos de la entrega por ID
    public boolean actualizar(Entrega ent) {
        String sql = "UPDATE Entrega SET fecha_entrega = ?, hora_entrega = ?, metodo_envio = ?, " +
                     "direccion_entrega = ?, estado = ?, notas = ? WHERE id = ?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, ent.getFecha());
            ps.setString(2, ent.getHora());
            ps.setString(3, ent.getMetodo());
            ps.setString(4, ent.getDireccion());
            ps.setString(5, ent.getEstado());
            ps.setString(6, ent.getNotas());
            ps.setInt(7, ent.getId());

            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al actualizar la entrega: " + e.getMessage());
            return false;
        }
    }

    // 4. Eliminar una entrega
    public boolean eliminar(int id) {
        String sql = "DELETE FROM Entrega WHERE id = ?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error al eliminar la entrega física: " + e.getMessage());
            return false;
        }
    }
}