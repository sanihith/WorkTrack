package com.taskportal.controller;

import java.util.List;

public class BulkDeleteCommentsRequest {
    private List<Long> ids;

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}
