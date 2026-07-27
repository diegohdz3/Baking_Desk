package com.mycompany.mavenproject1;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ClienteDAO {

    // ---- LISTAR TODOS ----
    public List<Cliente> obtenerTodos() {
        List<Cliente> lista = new ArrayList<>();
        String sql = "SELECT id, nombre, telefono, email, direccion, estado FROM Cliente ORDER BY id DESC";

        try (Connection con = ConexionBD.getConexion();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery(sql)) {

            while (rs.next()) {
                Cliente c = new Cliente();
                c.setId(rs.getInt("id"));
                c.setNombre(rs.getString("nombre"));
                c.setTelefono(rs.getString("telefono"));
                c.setEmail(rs.getString("email"));
                c.setDireccion(rs.getString("direccion"));
                c.setEstado(rs.getString("estado"));
                lista.add(c);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return lista;
    }

    // ---- CREAR NUEVO (EL QUE NECESITAS PARA TU DEMOSTRACIÓN) ----
    public Cliente crear(Cliente c) {
        System.out.println("DEBUG: Iniciando inserción de cliente: " + c.getNombre());
        String sql = "INSERT INTO Cliente (nombre, telefono, email, direccion, estado) VALUES (?, ?, ?, ?, ?)";

        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, c.getNombre());
            ps.setString(2, c.getTelefono());
            ps.setString(3, c.getEmail());
            ps.setString(4, c.getDireccion());
            // Se asegura de que el estado tenga un valor por defecto si es nulo
            ps.setString(5, (c.getEstado() == null || c.getEstado().isEmpty()) ? "activo" : c.getEstado());
            
            int filasAfectadas = ps.executeUpdate();
            System.out.println("DEBUG: Inserción exitosa. Filas afectadas: " + filasAfectadas);

            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    c.setId(rs.getInt(1));
                    System.out.println("DEBUG: Nuevo ID asignado: " + c.getId());
                }
            }
        } catch (SQLException e) {
            System.err.println("ERROR SQL al crear cliente: " + e.getMessage());
            e.printStackTrace();
        }
        return c;
    }

    // ---- ACTUALIZAR ----
    public Cliente actualizar(int id, Cliente c) {
        String sql = "UPDATE Cliente SET nombre=?, telefono=?, email=?, direccion=?, estado=? WHERE id=?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setString(1, c.getNombre());
            ps.setString(2, c.getTelefono());
            ps.setString(3, c.getEmail());
            ps.setString(4, c.getDireccion());
            ps.setString(5, (c.getEstado() == null || c.getEstado().isEmpty()) ? "activo" : c.getEstado());
            ps.setInt(6, id);
            ps.executeUpdate();
            c.setId(id);
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return c;
    }

    // ---- ELIMINAR ----
    public boolean eliminar(int id) {
        String sql = "DELETE FROM Cliente WHERE id=?";
        try (Connection con = ConexionBD.getConexion();
             PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
}