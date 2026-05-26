#ifndef DISK_WIN_H
#define DISK_WIN_H

#include <stdint.h>
#include <stdbool.h>

#define MAX_DRIVES 16
#define MAX_PATH_LEN 256
#define MAX_NAME_LEN 128

typedef struct {
    char name[MAX_NAME_LEN];
    char path[MAX_PATH_LEN];
    uint64_t capacity;
    uint64_t free_space;
    char filesystem[32];
    char type[32]; // "SSD", "USB", "SD", "HDD", "UNKNOWN"
    bool is_primary;
} C_DriveInfo;

int c_list_drives(C_DriveInfo* out_drives, int max_drives);
int c_read_sectors(const char* drive_path, uint64_t offset, uint32_t size, uint8_t* out_buffer);

#endif // DISK_WIN_H
