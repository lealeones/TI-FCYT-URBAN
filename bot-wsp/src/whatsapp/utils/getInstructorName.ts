// Primer instructor (fallback a “—”)
export const getInstructorName = (clase: any): string => {
    // compatibilidad si viene "instructor" o "instructors"
    const arr = Array.isArray(clase?.instructors)
        ? clase.instructors
        : Array.isArray(clase?.instructor)
            ? clase.instructor
            : [];
    return arr[0]?.name || "—";
};